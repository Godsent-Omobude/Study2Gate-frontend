import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import study2gateLogo from "../assets/study2gate-logo.png";
import { Eye, EyeOff, Check, X, Download } from "lucide-react";
import PasswordRequirementsChecklist from "../components/PasswordRequirementsChecklist";
import EqualizerLoader from "../components/EqualizerLoader";
import BackendStatusBanner from "../components/BackendStatusBanner";
import { isPasswordValid } from "../utils/passwordRequirements";
import { friendlyErrorMessage } from "../utils/errorMessage";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const value = username.trim();
    if (value.length < 3) {
      setUsernameStatus("");
      return undefined;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const response = await api.get(`/auth/check-username/${encodeURIComponent(value)}`);
        setUsernameStatus(response.data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError("Password does not meet the requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken. Please choose another.");
      return;
    }

    if (usernameStatus === "checking") {
      setError("Please wait while we check your username.");
      return;
    }

    if (!agreedToPrivacy) {
      setError("You must agree to the Copyright Policy to create an account.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        fullName,
        email,
        username,
        matricNumber,
        password,
        copyrightPolicyAccepted: agreedToPrivacy,
      });

      // Accounts start unverified — no session is created yet. Send the
      // user on to enter the code we just emailed them.
      navigate("/verify-email", {
        state: {
          email: response.data.email || email,
          message: response.data.message,
        },
      });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Registration failure."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackendStatusBanner />
      <div className="min-h-screen bg-brand-light px-4 py-6 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <div className="bg-accent px-6 pb-7 pt-8 text-white">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
                <img src={study2gateLogo} alt="Study2Gate" className="h-full w-full object-cover" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Study<span className="logo-mark text-accent-soft">2Gate</span>
              </h1>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-soft">
                Share. Learn. Succeed.
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-accent-soft">
                Your notes. Your flashcards. Your study space.
              </p>
            </div>
          </div>

          <div className="px-6 pb-8 pt-7 sm:px-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Create Account
            </h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Set up your Study2Gate student account.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-5 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent-soft"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent-soft"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Username</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  className={`mt-2 w-full rounded-xl border bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:bg-white focus:ring-4 ${
                    usernameStatus === "taken"
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : usernameStatus === "available"
                        ? "border-green-300 focus:border-green-500 focus:ring-green-100"
                        : "border-slate-200 focus:border-accent focus:ring-accent-soft"
                  }`}
                />
                <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                  usernameStatus === "taken" ? "text-red-600" :
                  usernameStatus === "available" ? "text-green-600" : "text-slate-400"
                }`}>
                  {usernameStatus === "checking" && "Checking username..."}
                  {usernameStatus === "available" && (<><Check className="h-3.5 w-3.5" /> Username is available</>)}
                  {usernameStatus === "taken" && (<><X className="h-3.5 w-3.5" /> Username is already taken</>)}
                  {!usernameStatus && "3–30 characters: letters, numbers, dots, underscores or hyphens."}
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Matriculation Number <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  placeholder="Enter your matriculation number"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent-soft"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent-soft"
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
                {passwordFocused && (
                  <PasswordRequirementsChecklist password={password} />
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                <div className="relative mt-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent-soft"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  required
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-accent focus:ring-accent"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-bold text-accent hover:underline">
                    Terms &amp; Conditions
                  </Link>
                  ,{" "}
                  <Link to="/privacy" target="_blank" className="font-bold text-accent hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/copyright" target="_blank" className="font-bold text-accent hover:underline">
                    Copyright Policy
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  loading ||
                  usernameStatus === "taken" ||
                  usernameStatus === "checking" ||
                  !isPasswordValid(password) ||
                  !agreedToPrivacy
                }
                className="flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-sm font-black text-white transition hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <EqualizerLoader label="Creating account…" /> : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link to="/login" className="font-bold text-accent hover:underline">
                Log in
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

            <div className="mt-7 border-t border-slate-100 pt-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-accent">
                A STUDENT PLATFORM BY GODSENT OMOBUDE
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
