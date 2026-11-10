import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import logo from "../assets/study2gate-logo.png";
import EqualizerLoader from "../components/EqualizerLoader";
import { safeInternalPath } from "../utils/safeRedirect";

export default function AcceptCopyrightPolicy() {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const pendingToken = location.state?.pendingToken || null;
  const redirectTo = safeInternalPath(
    location.state?.redirectTo || searchParams.get("redirect"),
    "/"
  );

  const finishLogin = (user, fallbackUsername) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userId", String(user.id || ""));
    localStorage.setItem("fullName", user.fullName || fallbackUsername || "");
    localStorage.setItem("username", user.username || fallbackUsername || "");
    localStorage.setItem("email", user.email || "");
    localStorage.setItem("matricNumber", user.matricNumber || "");
    localStorage.setItem("role", user.role || "student");
    localStorage.setItem("profilePicture", user.profilePicture || "");
    localStorage.setItem("theme", user.theme || "system");
    localStorage.setItem("accentColor", user.accentColor || "blue");

    navigate(redirectTo);
  };

  const handleAccept = async (event) => {
    event.preventDefault();
    setError("");

    if (!accepted) {
      setError("You must accept the Copyright Policy to continue.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/accept-copyright-policy", {
        pendingToken: pendingToken || undefined,
      });
      finishLogin(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("This request has expired. Please log in again.");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(err.response?.data?.message || "Unable to record your acceptance.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <div className="bg-accent px-6 pb-7 pt-8 text-center text-white">
            <div className="flex items-center justify-center gap-3">
              <img src={logo} alt="Study2Gate" className="h-12 w-12 rounded-2xl object-contain" />
              <h1 className="text-2xl font-black tracking-tight">
                Study<span className="logo-mark text-accent-soft">2Gate</span>
              </h1>
            </div>
          </div>

          <div className="px-6 pb-8 pt-7 sm:px-8">
            <h2 className="text-2xl font-black text-slate-900">One more step</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              We've updated our Copyright Policy. You need to review and accept it before
              continuing to Study2Gate.
            </p>

            <div className="mt-5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <p>
                Study2Gate respects the intellectual-property rights of authors, publishers,
                lecturers, educational institutions, students and other copyright owners. You are
                responsible for ensuring you have the rights, permission or other lawful basis to
                upload and share any material through Study2Gate — being educational or useful to
                students does not by itself make material free to reproduce or distribute.
                Study2Gate may restrict, remove, or take other action on content or accounts in
                response to credible copyright complaints.
              </p>
              <p className="mt-2">
                Read the full{" "}
                <Link to="/copyright" target="_blank" className="font-bold text-accent hover:underline">
                  Copyright Policy
                </Link>
                .
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAccept} className="mt-5 space-y-5">
              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  required
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-accent focus:ring-accent"
                />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/copyright" target="_blank" className="font-bold text-accent hover:underline">
                    Copyright Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !accepted}
                className="flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-sm font-black text-white transition hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <EqualizerLoader label="Continuing…" /> : "Accept & Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
