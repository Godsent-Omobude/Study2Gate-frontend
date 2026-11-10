import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      setLoading(true);
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to process your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-10">
          <div className="text-3xl font-black text-accent-hover">
            Study<span className="text-slate-900">2Gate</span>
          </div>

          <h1 className="mt-10 text-3xl font-black text-slate-900">Forgot password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the email address linked to your Study2Gate account and we will send you a password reset link.
          </p>

          {message && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              {message}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered your password?{" "}
            <Link to="/login" className="font-bold text-accent-hover hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
