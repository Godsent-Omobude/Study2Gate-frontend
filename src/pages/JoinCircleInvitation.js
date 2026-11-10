import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/api";

// This page is reached only when the user is authenticated — it lives
// inside ProtectedLayout/ProtectedRoute in App.js, which now preserves
// this exact URL (via ?redirect=) if the user had to log in first. So by
// the time this component renders, we always have a logged-in user and
// can safely validate + show the invitation before joining.
export default function JoinCircleInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", preview: null });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const loadPreview = useCallback(async () => {
    setState({ loading: true, error: "", preview: null });
    try {
      // Read-only: validates the token against the circle's live join-code
      // state (existence, expiry, enabled/valid, use limit, circle still
      // exists) without consuming a use or joining anything.
      const response = await api.get(`/circles/join/${token}/preview`);
      setState({ loading: false, error: "", preview: response.data });
    } catch (err) {
      setState({
        loading: false,
        error: err.response?.data?.message || "This invitation link is no longer valid.",
        preview: null,
      });
    }
  }, [token]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError("");
    try {
      // The backend independently re-verifies everything here too —
      // the preview above is only for display, it proves nothing on
      // its own. This is the actual authorization + membership write.
      const response = await api.post(`/circles/join/${token}`);
      navigate(`/circles/${response.data.circleId}`, { replace: true });
    } catch (err) {
      setJoinError(err.response?.data?.message || "Unable to join this Study Circle.");
      setJoining(false);
    }
  };

  const { loading, error, preview } = state;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Study Circle invitation</h1>

        {loading && (
          <p className="mt-3 text-sm text-slate-500">Checking this invitation...</p>
        )}

        {!loading && error && (
          <>
            <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
            <Link
              to="/circles"
              className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white"
            >
              Go to Study Circles
            </Link>
          </>
        )}

        {!loading && !error && preview?.alreadyMember && (
          <>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              You're already a member of {preview.circle.name}.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/circles/${preview.circle.id}`, { replace: true })}
              className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white"
            >
              Go to Circle
            </button>
          </>
        )}

        {!loading && !error && preview && !preview.alreadyMember && (
          <>
            <div className="mt-5 rounded-2xl border border-accent-soft bg-accent-soft/60 p-5 text-left">
              <p className="text-lg font-black text-slate-900">{preview.circle.name}</p>
              {preview.circle.courseCode && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent">
                  {preview.circle.courseCode}
                </p>
              )}
              {preview.circle.description && (
                <p className="mt-2 text-sm text-slate-600">{preview.circle.description}</p>
              )}
              <p className="mt-3 text-xs font-semibold text-slate-400">
                {preview.circle.memberCount} member{preview.circle.memberCount === 1 ? "" : "s"} ·{" "}
                {preview.circle.visibility === "PUBLIC" ? "Public" : "Private"}
              </p>
            </div>

            {joinError && (
              <p className="mt-4 text-sm font-semibold text-red-600">{joinError}</p>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 w-full rounded-xl bg-accent px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {joining ? "Joining..." : `Join ${preview.circle.name}`}
            </button>
            <Link to="/circles" className="mt-3 inline-block text-xs font-bold text-slate-400 hover:text-slate-600">
              Not now
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
