import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { Eye, EyeOff } from "lucide-react";
import PasswordRequirementsChecklist from "../components/PasswordRequirementsChecklist";
import { isPasswordValid } from "../utils/passwordRequirements";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet the requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(response.data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-10">
          <div className="logo-mark text-3xl font-black text-accent-hover">
            Study<span className="text-slate-900">2Gate</span>
          </div>

          <h1 className="mt-10 text-3xl font-black text-slate-900">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose a new password for your Study2Gate account.
          </p>

          {message && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              {message}{" "}
              <Link to="/login" className="underline">
                Log in
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700">New password</label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  autoComplete="new-password"
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
              <PasswordRequirementsChecklist password={password} />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Confirm password</label>
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter the password again"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 outline-none focus:border-accent focus:bg-white"
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

            <button
              type="submit"
              disabled={loading || !token || Boolean(message) || !isPasswordValid(password)}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-bold text-accent-hover hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
