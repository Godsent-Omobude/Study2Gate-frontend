import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import logo from "../assets/study2gate-logo.png";
import { Eye, EyeOff, Download, Fingerprint } from "lucide-react";
import { safeInternalPath } from "../utils/safeRedirect";
import { friendlyErrorMessage } from "../utils/errorMessage";
import EqualizerLoader from "../components/EqualizerLoader";
import BackendStatusBanner from "../components/BackendStatusBanner";
import { saveWidgetToken } from "../native/widgetToken";
import {
  dismissFingerprintOffer,
  enrollFingerprint,
  isFingerprintEnrolled,
  isFingerprintSupported,
  loginWithFingerprint,
  wasFingerprintOfferDismissed,
} from "../native/biometric";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Fingerprint login (native app only — both stay false in a browser).
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  // "Turn on fingerprint login?" step shown once after a password login.
  const [offerFingerprint, setOfferFingerprint] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Where to send the user after a successful login — e.g. back to the
  // Study Circle invitation they were on before being asked to sign in.
  // Only ever an internal route: never trust this for an off-site redirect.
  const redirectTo = safeInternalPath(searchParams.get("redirect"), "/");

  // Set by the axios interceptor (api/api.js) when a request came back 401
  // for a user who appeared logged in — i.e. their session actually died
  // server-side, as opposed to a plain login failure below.
  useEffect(() => {
    if (searchParams.get("sessionExpired") === "1") {
      setError("Your session expired. Please log in again.");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    // Only show the button if this phone has fingerprint set up AND the
    // app build/device can still use it (e.g. fingerprint not removed in
    // the phone's own settings since).
    if (!isFingerprintEnrolled()) return undefined;

    isFingerprintSupported().then((supported) => {
      if (!cancelled) setFingerprintReady(supported);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Shared by password and fingerprint login: stash the profile the
  // backend returned and give the widget its token.
  const saveSession = (data, fallbackUsername = "") => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userId", String(data.id || ""));
    localStorage.setItem("fullName", data.fullName || fallbackUsername);
    localStorage.setItem("username", data.username || fallbackUsername);
    localStorage.setItem("email", data.email || "");
    localStorage.setItem("matricNumber", data.matricNumber || "");
    localStorage.setItem("role", data.role || "student");
    localStorage.setItem("profilePicture", data.profilePicture || "");
    localStorage.setItem("theme", data.theme || "system");
    localStorage.setItem("accentColor", data.accentColor || "blue");

    // No-ops on web; on native, hands the widget its long-lived token.
    // Fire-and-forget — never delay navigation over this.
    saveWidgetToken();
  };

  // Returns true if it fully handled the error (navigated away).
  const handleAuthError = (err, fallbackMessage) => {
    if (err.response?.status === 429) {
      setError(err.response?.data?.message || "Too many login attempts. Please try again later.");
    } else if (err.response?.status === 403 && err.response?.data?.verificationRequired) {
      navigate("/verify-email", {
        state: {
          email: err.response.data.email || "",
          message: err.response.data.message,
        },
      });
    } else if (
      err.response?.status === 403 &&
      err.response?.data?.copyrightPolicyAcceptanceRequired
    ) {
      navigate("/accept-policy", {
        state: {
          pendingToken: err.response.data.pendingToken,
          redirectTo,
        },
      });
    } else {
      setError(friendlyErrorMessage(err, fallbackMessage));
    }
  };

  const handleFingerprintLogin = async () => {
    setError("");

    try {
      setFingerprintLoading(true);
      const user = await loginWithFingerprint();
      saveSession(user);
      navigate(redirectTo);
    } catch (err) {
      if (err.cancelled) return;

      if (err.response) {
        handleAuthError(err, "Fingerprint login failed. Please sign in with your password.");
        // The server no longer knows this phone — hide the button.
        if (err.response?.data?.code === "BIOMETRIC_INVALID") setFingerprintReady(false);
      } else {
        setError(err.message || "Fingerprint login failed.");
      }
    } finally {
      setFingerprintLoading(false);
    }
  };

  const finishAfterOffer = () => {
    setOfferFingerprint(false);
    setPassword("");
    navigate(redirectTo);
  };

  const handleEnableFromOffer = async () => {
    setOfferError("");

    try {
      setOfferBusy(true);
      await enrollFingerprint(password);
      finishAfterOffer();
    } catch (err) {
      if (err.cancelled) return;
      setOfferError(err.response?.data?.message || err.message || "Couldn't turn on fingerprint login.");
    } finally {
      setOfferBusy(false);
    }
  };

  const handleSkipOffer = () => {
    dismissFingerprintOffer();
    finishAfterOffer();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await api.post("/auth/login", { username, password });

      saveSession(response.data, username);

      // First password login on a phone that can do fingerprint but hasn't
      // set it up: offer it once, using the password we already have.
      if (!isFingerprintEnrolled() && !wasFingerprintOfferDismissed() && (await isFingerprintSupported())) {
        setOfferFingerprint(true);
        return;
      }

      navigate(redirectTo);
    } catch (err) {
      handleAuthError(err, "Authentication system failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackendStatusBanner />
      <div className="min-h-screen bg-brand-light px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 lg:grid-cols-2">
          <div className="hidden bg-accent p-12 text-white lg:block">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Study2Gate logo"
                className="h-12 w-12 rounded-2xl object-contain"
              />
              <div className="font-display text-3xl font-black tracking-tight">
                Study<span className="logo-mark text-accent-soft">2Gate</span>
              </div>
            </div>
            <div className="mt-24">
              <p className="text-sm font-bold uppercase tracking-widest text-accent-soft">
                Academic workspace
              </p>
              <h1 className="mt-4 text-5xl font-black leading-tight">
                Study smarter with your own materials.
              </h1>
              <p className="mt-5 max-w-md text-slate-200">
                Share resources, generate AI flashcards and revise from one organised student platform.
              </p>
            </div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <img
                  src={logo}
                  alt="Study2Gate logo"
                  className="h-14 w-14 rounded-2xl object-contain"
                />
                <span className="font-display text-2xl font-black tracking-tight text-slate-900">
                  Study<span className="logo-mark text-accent">2Gate</span>
                </span>
              </div>

              <h2 className="text-3xl font-black text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to continue to Study2Gate.
              </p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-700">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-accent focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">Password</label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 outline-none focus:border-accent focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end -mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-accent-hover hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
                >
                  {loading ? <EqualizerLoader label="Signing in…" /> : "Sign In"}
                </button>
              </form>

              {fingerprintReady && (
                <button
                  type="button"
                  onClick={handleFingerprintLogin}
                  disabled={fingerprintLoading || loading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-accent py-3.5 text-sm font-black text-accent-hover hover:bg-slate-50 disabled:opacity-60"
                >
                  <Fingerprint className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                  {fingerprintLoading ? "Waiting for fingerprint…" : "Sign in with fingerprint"}
                </button>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">
                New to Study2Gate?{" "}
                <Link to="/register" className="font-bold text-accent-hover hover:underline">
                  Create an account
                </Link>
              </p>

              <a
                href="/study2gate.apk"
                download
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Download className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                Download App
              </a>

              <p className="mt-3 text-center text-xs text-slate-400">
                <Link to="/terms" className="hover:underline">
                  Terms &amp; Conditions
                </Link>
                {" · "}
                <Link to="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                {" · "}
                <Link to="/copyright" className="hover:underline">
                  Copyright Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {offerFingerprint && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
              <Fingerprint className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-900">Use your fingerprint next time?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to Study2Gate with a touch instead of typing your password. You can turn this off any
              time in Settings.
            </p>

            {offerError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {offerError}
              </div>
            )}

            <button
              type="button"
              onClick={handleEnableFromOffer}
              disabled={offerBusy}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {offerBusy ? "Turning on…" : "Turn on fingerprint login"}
            </button>
            <button
              type="button"
              onClick={handleSkipOffer}
              disabled={offerBusy}
              className="mt-2 w-full rounded-xl py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
