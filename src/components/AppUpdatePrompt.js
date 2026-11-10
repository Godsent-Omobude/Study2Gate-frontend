import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { App } from "@capacitor/app";
import {
  canCheckForAppUpdate,
  checkForAppUpdate,
  isValidUpdateLink,
  openUpdateLink,
  snoozeAppUpdate,
} from "../utils/appUpdate";

// At most one check per hour while the app stays open; a cold start always
// checks (lastCheckRef starts at 0).
const MIN_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Mounted once in App.js. Renders nothing in a browser or when the app is
// up to date. In the native Android app it checks on launch and whenever
// the app returns to the foreground, then shows either a dismissible
// "Update available" card or — when the backend's minimum version is
// above the installed one — an "Update required" card that can't be closed.
export default function AppUpdatePrompt() {
  const [update, setUpdate] = useState(null);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (!canCheckForAppUpdate()) return undefined;

    let cancelled = false;
    let listener = null;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;

      const result = await checkForAppUpdate();
      if (!cancelled && result) setUpdate(result);
    };

    check();

    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) check();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });

    return () => {
      cancelled = true;
      if (listener) listener.remove();
    };
  }, []);

  if (!update) return null;

  const { force, latestVersionCode, latestVersionName, releaseNotes, downloadUrl } = update;
  const canOpenLink = isValidUpdateLink(downloadUrl);

  const handleLater = () => {
    snoozeAppUpdate(latestVersionCode);
    setUpdate(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Download className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-lg font-black text-slate-900">
          {force ? "Update required" : "Update available"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {force
            ? "This version of Study2Gate is no longer supported. Please update to keep using the app."
            : "A newer version of Study2Gate is ready with the latest improvements and fixes."}
          {latestVersionName ? ` (Version ${latestVersionName})` : ""}
        </p>

        {releaseNotes && (
          <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-left text-xs leading-5 text-slate-600">
            {releaseNotes}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {canOpenLink ? (
            <button
              type="button"
              onClick={() => openUpdateLink(downloadUrl)}
              className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover"
            >
              Update now
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              Please update Study2Gate from the place you installed it.
            </p>
          )}
          {!force && (
            <button
              type="button"
              onClick={handleLater}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
