import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, FileText, PartyPopper } from "lucide-react";
import api from "../api/api";
import {
  FLASHCARD_REQUEST_TIMEOUT_MS,
  buildOfflineStudyAll,
  isOfflineError,
  refreshFlashcardCache,
} from "../utils/flashcardCache";

const RATINGS = [
  { key: "again", label: "Again", hint: "< 1 min", className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
  { key: "hard", label: "Hard", hint: "shorter gap", className: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
  { key: "good", label: "Good", hint: "on schedule", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" },
  { key: "easy", label: "Easy", hint: "longer gap", className: "bg-accent-soft text-accent-hover hover:bg-accent-soft border-accent-soft" },
];

export default function StudyAll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dueOnly = searchParams.get("dueOnly") === "true";

  const [cards, setCards] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // True when this deck was rebuilt from the cards saved on this phone.
  const [offline, setOffline] = useState(false);
  // Ratings that couldn't be saved because there was no connection.
  const [unsavedCount, setUnsavedCount] = useState(0);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [finished, setFinished] = useState(false);

  const load = async (nextDueOnly) => {
    try {
      setLoading(true);
      setError("");
      setIndex(0);
      setRevealed(false);
      setReviewed(0);
      setUnsavedCount(0);
      setFinished(false);

      const response = await api.get("/ai/flashcards/study-all", {
        params: { dueOnly: nextDueOnly ? "true" : "false" },
        timeout: FLASHCARD_REQUEST_TIMEOUT_MS,
      });

      setCards(response.data?.flashcards || []);
      setTotalCount(response.data?.totalCount || 0);
      setDueCount(response.data?.dueCount || 0);
      setOffline(false);

      // Keep the copy saved on this phone current (due dates change as you
      // review), so Study All still works next time there's no connection.
      refreshFlashcardCache();
    } catch (err) {
      // No connection: rebuild the deck from the cards saved on this phone.
      const saved = isOfflineError(err) ? await buildOfflineStudyAll(nextDueOnly) : null;

      if (saved) {
        setCards(saved.flashcards);
        setTotalCount(saved.totalCount);
        setDueCount(saved.dueCount);
        setOffline(true);
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to build your study session."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(dueOnly);
  }, [dueOnly]);

  const toggleDueOnly = () => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (dueOnly) params.delete("dueOnly");
      else params.set("dueOnly", "true");
      return params;
    });
  };

  const currentCard = cards[index];
  const progress = cards.length ? ((index + 1) / cards.length) * 100 : 0;

  // How many cards to show before an "Again" card comes back up, so it
  // isn't just repeated immediately but still resurfaces this session
  // (the backend also reschedules it for 1 minute out, for next time).
  const AGAIN_REQUEUE_GAP = 3;

  const rate = async (rating) => {
    if (!currentCard || submitting) return;

    try {
      setSubmitting(true);

      try {
        await api.post(
          `/ai/flashcards/${currentCard.flashcardSetId}/cards/${currentCard.id}/review`,
          { rating }
        );
        setReviewed((count) => count + 1);
      } catch (saveError) {
        // A real server reply (an error) still stops here as before. With no
        // connection at all, carry on studying — the rating just isn't saved.
        if (saveError.response) throw saveError;
        setUnsavedCount((count) => count + 1);
      }

      if (rating === "again") {
        // Reinsert this card a few positions ahead instead of dropping it
        // from the session, so the user sees it again before finishing.
        setCards((prev) => {
          const next = [...prev];
          const insertAt = Math.min(index + 1 + AGAIN_REQUEUE_GAP, next.length);
          next.splice(insertAt, 0, currentCard);
          return next;
        });
        setIndex((i) => i + 1);
        setRevealed(false);
        return;
      }

      if (index + 1 >= cards.length) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
        setRevealed(false);
      }
    } catch (err) {
      window.alert(
        err.response?.data?.message || "Unable to save that review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const emptyState = useMemo(() => {
    if (loading || cards.length > 0) return null;
    if (dueOnly) {
      return {
        title: "Nothing due right now",
        body: "Every card is scheduled for later. Switch to All Cards to review anyway, or come back when something's due.",
      };
    }
    return {
      title: "No saved flashcards yet",
      body: "Generate a set from a PDF or DOCX to start building your spaced-repetition deck.",
    };
  }, [loading, cards.length, dueOnly]);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/my-flashcards" className="inline-flex items-center gap-1 text-xs font-bold text-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Flashcards
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-accent">SPACED REPETITION</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Study All</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every flashcard you've generated, shuffled fresh each time — never the same
              order twice.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleDueOnly}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-bold transition ${
              dueOnly
                ? "border-accent bg-accent text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {dueOnly ? (<><Check className="h-4 w-4" /> Due cards only</>) : "Show due cards only"}
          </button>
        </div>

        {!loading && cards.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            {dueOnly
              ? `${cards.length} of ${totalCount} cards are due for review`
              : `${totalCount} total cards saved · ${dueCount} due right now`}
          </p>
        )}

        {offline && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Can't reach Study2Gate — using your flashcards saved on this phone. Your ratings
            won't be saved until you're back online.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 animate-pulse rounded-3xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
            Shuffling your deck...
          </div>
        ) : emptyState ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-900">{emptyState.title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{emptyState.body}</p>
            {!dueOnly && (
              <Link
                to="/generate-flashcards"
                className="mt-5 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover"
              >
                Generate Flashcards
              </Link>
            )}
          </section>
        ) : finished ? (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-emerald-600" />
            <h2 className="mt-2 text-xl font-black text-slate-900">Deck complete</h2>
            <p className="mt-1 text-sm text-slate-600">
              {unsavedCount > 0
                ? `You went through ${cards.length} cards. ${unsavedCount} rating${
                    unsavedCount === 1 ? " wasn't" : "s weren't"
                  } saved because there was no connection, so those review dates are unchanged.`
                : `You reviewed ${reviewed} of ${cards.length} cards. Each rating updated that card's next review date.`}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => load(dueOnly)}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-black text-white hover:bg-accent-hover"
              >
                Study Again (new shuffle)
              </button>
              <Link
                to="/my-flashcards"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Back to My Flashcards
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <p className="mb-2 text-sm text-slate-500">
              Card {index + 1} of {cards.length}
              {currentCard?.setTitle ? ` · from "${currentCard.setTitle}"` : ""}
            </p>

            <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div
              className="w-full cursor-pointer rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              onClick={() => setRevealed(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!revealed && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setRevealed(true);
                }
              }}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-hover">
                  Question
                </span>
                {!revealed && (
                  <span className="text-xs font-semibold text-slate-400">
                    Click to reveal answer
                  </span>
                )}
              </div>

              <div className="flex min-h-[100px] items-center justify-center text-center">
                <p className="text-lg font-semibold leading-8 text-slate-800 sm:text-xl">
                  {currentCard.front}
                </p>
              </div>

              {revealed && (
                <div className="mt-6 rounded-2xl border border-accent-soft bg-accent-soft p-5 text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-accent-hover">
                    Answer
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-800">{currentCard.back}</p>
                </div>
              )}
            </div>

            {revealed ? (
              <div className="mt-5">
                <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {RATINGS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={submitting}
                      onClick={() => rate(r.key)}
                      className={`rounded-xl border px-3 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${r.className}`}
                    >
                      {r.label}
                      <span className="mt-0.5 block text-[10px] font-semibold opacity-70">
                        {r.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-center text-xs font-semibold text-slate-400">
                Reveal the answer to rate how well you remembered it.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
