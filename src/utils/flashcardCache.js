import api from "../api/api";

// Keeps a copy of the user's flashcards on the device (IndexedDB) so they can
// be opened and studied without a connection.
//
// What's saved: the My Flashcards list (every set, with all of its cards) and
// any single set that was opened. "Study All" works offline by rebuilding its
// deck from that saved list.
//
// What's deliberately NOT here: ratings, practice results and streaks. Those
// still go straight to the server exactly as before, so offline they simply
// aren't recorded.
//
// Every function swallows its own errors (private browsing, storage full, no
// IndexedDB) and falls back to "nothing cached", so a storage problem can
// never break the online experience.

const DB_NAME = "study2gate-offline";
const STORE = "kv";
const LIST_KEY = "flashcards:list";
const setKey = (id) => `flashcards:set:${id}`;

// How long online screens wait before giving up and using the saved copy.
// Without a limit, a weak connection would just spin for a very long time.
export const FLASHCARD_REQUEST_TIMEOUT_MS = 8000;

// No server response at all = offline, weak signal or timeout. (A reply such
// as 404 or 500 means the server was reached, so that's not "offline".)
export const isOfflineError = (error) => !error?.response;

// Saved data is filed under the logged-in user's id so one account's cards
// can never show up for another on a shared phone.
const userPrefix = () => {
  try {
    const id = localStorage.getItem("userId");
    return id ? `u${id}:` : null;
  } catch {
    return null;
  }
};

let dbPromise = null;

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available."));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
};

const idbGet = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbWrite = async (action) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const idbKeys = async () => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Saves the full list of the user's sets (each includes its cards).
export async function cacheFlashcardList(sets) {
  const prefix = userPrefix();
  if (!prefix || !Array.isArray(sets)) return;

  try {
    await idbWrite((store) => store.put({ savedAt: Date.now(), sets }, prefix + LIST_KEY));

    // Drop anything saved for a different account on this device.
    const keys = await idbKeys();
    const others = keys.filter((key) => typeof key === "string" && !key.startsWith(prefix));
    if (others.length) {
      await idbWrite((store) => others.forEach((key) => store.delete(key)));
    }
  } catch {
    // Caching is best-effort.
  }
}

export async function getCachedFlashcardList() {
  const prefix = userPrefix();
  if (!prefix) return null;

  try {
    const entry = await idbGet(prefix + LIST_KEY);
    return Array.isArray(entry?.sets) ? entry.sets : null;
  } catch {
    return null;
  }
}

// Saves one opened set (this also covers sets that aren't in the user's own
// list, such as a Study Circle's set they were allowed to open).
export async function cacheFlashcardSet(set) {
  const prefix = userPrefix();
  if (!prefix || !set?.id) return;

  try {
    await idbWrite((store) => store.put({ savedAt: Date.now(), set }, prefix + setKey(set.id)));
  } catch {
    // Caching is best-effort.
  }
}

// Newest saved copy of a set, whether it came from opening the set itself or
// from the saved list.
export async function getCachedFlashcardSet(id) {
  const prefix = userPrefix();
  if (!prefix) return null;

  try {
    const [setEntry, listEntry] = await Promise.all([
      idbGet(prefix + setKey(id)),
      idbGet(prefix + LIST_KEY),
    ]);

    const fromList = Array.isArray(listEntry?.sets)
      ? listEntry.sets.find((set) => String(set.id) === String(id))
      : null;

    const candidates = [
      setEntry?.set ? { savedAt: setEntry.savedAt || 0, set: setEntry.set } : null,
      fromList ? { savedAt: listEntry.savedAt || 0, set: fromList } : null,
    ].filter(Boolean);

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.savedAt - a.savedAt);
    return candidates[0].set;
  } catch {
    return null;
  }
}

// Call after a set is deleted so it doesn't linger offline.
export async function removeCachedFlashcardSet(id) {
  const prefix = userPrefix();
  if (!prefix) return;

  try {
    await idbWrite((store) => store.delete(prefix + setKey(id)));

    const listEntry = await idbGet(prefix + LIST_KEY);
    if (Array.isArray(listEntry?.sets)) {
      const sets = listEntry.sets.filter((set) => String(set.id) !== String(id));
      await idbWrite((store) => store.put({ ...listEntry, sets }, prefix + LIST_KEY));
    }
  } catch {
    // Best-effort.
  }
}

// Wipes everything saved on this device (used on logout / account deletion).
export async function clearFlashcardCache() {
  try {
    await idbWrite((store) => store.clear());
  } catch {
    // Nothing to clear, or storage unavailable.
  }
}

// Re-downloads the list and saves it. Study All calls this after a
// successful load so due dates saved for offline use stay current.
export async function refreshFlashcardCache() {
  try {
    const response = await api.get("/ai/flashcards");
    await cacheFlashcardList(response.data?.flashcardSets);
  } catch {
    // Offline or failed — the existing saved copy simply stays as it was.
  }
}

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Offline stand-in for GET /ai/flashcards/study-all: same response shape,
// built from the saved list. Returns null if nothing is saved yet.
export async function buildOfflineStudyAll(dueOnly) {
  const sets = await getCachedFlashcardList();
  if (!sets) return null;

  const now = new Date();
  const all = sets.flatMap((set) =>
    (set.flashcards || []).map((card) => ({
      ...card,
      flashcardSetId: set.id,
      setTitle: set.title,
    }))
  );

  const isDue = (card) => new Date(card.dueDate) <= now;
  const cards = dueOnly ? all.filter(isDue) : all;

  return {
    flashcards: shuffle(cards),
    totalCount: all.length,
    dueCount: dueOnly ? cards.length : all.filter(isDue).length,
  };
}
