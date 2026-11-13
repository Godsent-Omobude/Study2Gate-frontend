import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Megaphone, X } from "lucide-react";
import { fetchActiveAnnouncements, dismissAnnouncement } from "../api/announcements";
import { openUpdateLink } from "../utils/appUpdate";
import useBackClose from "../hooks/useBackClose";

// Shows announcements an admin has sent (Admin → Announcements) as a popup
// when a signed-in user opens or returns to the app. Each one is shown until
// the user closes it, then never again for that account.
//
// Mounted once inside ProtectedLayout. The module-level state below survives
// that layout being remounted when the user moves between pages, so
// navigating around doesn't re-request or re-show anything.
const MIN_REFETCH_MS = 60 * 1000;

let cacheOwner = null; // userId the cache below belongs to
let lastFetchAt = 0;
let cachedQueue = [];
const dismissedThisSession = new Set();

const visible = (list) => list.filter((item) => !dismissedThisSession.has(item.id));

export default function AnnouncementPopup() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const owner = localStorage.getItem("userId");
    if (owner !== cacheOwner) {
      // A different account signed in during the same page life.
      cacheOwner = owner;
      lastFetchAt = 0;
      cachedQueue = [];
      dismissedThisSession.clear();
    }

    if (Date.now() - lastFetchAt < MIN_REFETCH_MS) {
      setQueue((previous) => (previous.length ? previous : visible(cachedQueue)));
      return;
    }

    lastFetchAt = Date.now();
    try {
      cachedQueue = await fetchActiveAnnouncements();
      if (mountedRef.current) {
        // Don't swap the popup under someone who is mid-read.
        setQueue((previous) => (previous.length ? previous : visible(cachedQueue)));
      }
    } catch {
      // A missing popup is harmless, so failures stay silent. (An expired
      // session is already handled by the shared api interceptor.)
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    // On the native app, returning from the background is reported by
    // Capacitor rather than reliably by the WebView.
    let nativeListener;
    let cancelled = false;
    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
        CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) load();
        }).then((handle) => {
          if (cancelled) handle.remove();
          else nativeListener = handle;
        });
      }
    } catch {
      // Not running natively; visibilitychange above is enough.
    }

    return () => {
      mountedRef.current = false;
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      nativeListener?.remove();
    };
  }, [load]);

  const current = queue[0];

  const dismiss = useCallback((announcement) => {
    dismissedThisSession.add(announcement.id);
    setQueue((previous) => previous.filter((item) => item.id !== announcement.id));
    dismissAnnouncement(announcement.id).catch(() => {
      // Offline or a server hiccup: it may show once more next time, which
      // is better than losing the message.
    });
  }, []);

  // The Android back button closes the popup the same way "Got it" does.
  useBackClose(Boolean(current), () => current && dismiss(current));

  if (!current) return null;

  const openLink = () => {
    const url = current.linkUrl;
    dismiss(current);
    if (!url) return;
    if (url.startsWith("/")) navigate(url);
    else openUpdateLink(url); // https only; uses the in-app browser on Android
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={() => dismiss(current)}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Megaphone className="h-6 w-6" />
        </div>

        <h3 id="announcement-title" className="mt-4 break-words text-lg font-black text-slate-900">
          {current.title}
        </h3>
        <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-line break-words text-sm leading-6 text-slate-500">
          {current.body}
        </p>

        {queue.length > 1 && (
          <p className="mt-3 text-xs font-bold text-slate-400">
            1 of {queue.length} new announcements
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {current.linkUrl ? (
            <>
              <button
                type="button"
                onClick={openLink}
                className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover"
              >
                {current.linkLabel || "Learn more"}
              </button>
              <button
                type="button"
                onClick={() => dismiss(current)}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Dismiss
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => dismiss(current)}
              className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
