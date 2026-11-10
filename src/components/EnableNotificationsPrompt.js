import { useState } from "react";
import { Bell } from "lucide-react";
import { requestPermissionAndRegister } from "../firebase/messaging";
import { registerPushDevice } from "../api/pushNotifications";

// Shown once, right after a brand-new user verifies their email and is
// signed in for the first time (see VerifyEmail.js). Used on every
// platform — native Android app, regular browser, installed PWA and the
// TWA — since requestPermissionAndRegister() already picks the right
// mechanism for each. Gives context before the real OS/browser permission
// dialog, rather than firing that dialog with zero explanation — both for
// a better opt-in rate and because some browsers quietly downgrade
// permission prompts that appear with no user interaction/context behind
// them.
//
// - onSkip:     user tapped "Not now" (go straight to the app).
// - onContinue: user went through the enable flow, whatever the outcome
//               (VerifyEmail sends them on to Settings → Notifications).
export default function EnableNotificationsPrompt({ open, onSkip, onContinue }) {
  const [phase, setPhase] = useState("ask"); // "ask" | "busy" | "result"
  const [resultMessage, setResultMessage] = useState("");

  if (!open) return null;

  const handleEnable = async () => {
    setPhase("busy");
    try {
      const result = await requestPermissionAndRegister();

      if (result.permission === "granted") {
        await registerPushDevice(result.token, result.deviceInfo);
        localStorage.setItem("fcmToken", result.token);
        setResultMessage("Notifications enabled — you're all set!");
      } else if (result.permission === "denied") {
        setResultMessage(
          "Notifications are off. You can change this any time in the settings you're about to open."
        );
      } else {
        setResultMessage("No problem — you can enable notifications any time from Settings.");
      }
    } catch (err) {
      setResultMessage(
        err.message || "Unable to enable notifications right now. You can try again from Settings."
      );
    } finally {
      setPhase("result");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Bell className="h-6 w-6" />
        </div>

        {phase !== "result" ? (
          <>
            <h3 className="mt-4 text-lg font-black text-slate-900">
              Stay in the loop
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Turn on notifications to hear about Study Circle messages, invitations, and
              activity — even when the app isn't open.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={phase === "busy"}
                className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {phase === "busy" ? "Requesting..." : "Enable Notifications"}
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={phase === "busy"}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-60"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-slate-600">{resultMessage}</p>
            <button
              type="button"
              onClick={onContinue}
              className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover"
            >
              Go to notification settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
