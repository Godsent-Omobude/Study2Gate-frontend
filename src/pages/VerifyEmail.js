import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import { getPermissionStateAsync } from "../firebase/messaging";
import EnableNotificationsPrompt from "../components/EnableNotificationsPrompt";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const applySession = (data) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userId", String(data.id || ""));
    localStorage.setItem("fullName", data.fullName || "");
    localStorage.setItem("username", data.username || "");
    localStorage.setItem("email", data.email || "");
    localStorage.setItem("matricNumber", data.matricNumber || "");
    localStorage.setItem("role", data.role || "student");
    localStorage.setItem("profilePicture", data.profilePicture || "");
    localStorage.setItem("theme", data.theme || "system");
    localStorage.setItem("accentColor", data.accentColor || "blue");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    try {
      setLoading(true);
      const response = await api.post("/auth/verify-email", { email, code });
      applySession(response.data);

      // This is the first moment a brand-new user is actually logged in,
      // so it's the right point to ask about notifications — on every
      // platform (native app, browser, PWA/TWA).
      //   not-requested → show our explainer, then the real permission dialog
      //   denied        → can't re-prompt; send them to the settings page,
      //                   which explains how to unblock
      //   granted / unsupported → nothing to ask; straight into the app
      const permission = await getPermissionStateAsync();
      if (permission === "not-requested") {
        setShowNotificationPrompt(true);
      } else if (permission === "denied") {
        navigate("/settings/notifications");
      } else {
        navigate("/");
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message || "Too many attempts. Please try again later.");
      } else {
        setError(err.response?.data?.message || "Unable to verify email address.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    try {
      setResending(true);
      const response = await api.post("/auth/resend-verification", { email });
      setInfo(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-10">
          <div className="logo-mark text-3xl font-black text-accent-hover">
            Study<span className="text-slate-900">2Gate</span>
          </div>

          <h1 className="mt-10 text-3xl font-black text-slate-900">Verify your email</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the 6-digit code we emailed you to finish setting up your Study2Gate account.
          </p>

          {info && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              {info}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-accent focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Verification code</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-accent focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-5 w-full text-center text-sm font-bold text-accent-hover hover:underline disabled:opacity-60"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-bold text-accent-hover hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>

      <EnableNotificationsPrompt
        open={showNotificationPrompt}
        onSkip={() => navigate("/")}
        onContinue={() => navigate("/settings/notifications")}
      />
    </div>
  );
}
