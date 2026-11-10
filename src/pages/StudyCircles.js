import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersIcon } from "../components/icons/AdminIcons";
import api from "../api/api";

const VISIBILITY_BADGE = {
  PUBLIC: "bg-emerald-50 text-emerald-700",
  PRIVATE: "bg-slate-100 text-slate-600",
};

function CircleCard({ circle, footer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-900">{circle.name}</h3>
          {circle.courseCode && (
            <p className="mt-0.5 text-xs font-bold text-accent">
              {circle.courseCode}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
            VISIBILITY_BADGE[circle.visibility] || VISIBILITY_BADGE.PRIVATE
          }`}
        >
          {circle.visibility}
        </span>
      </div>

      {circle.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {circle.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <span>{circle.memberCount} member{circle.memberCount === 1 ? "" : "s"}</span>
        {circle.role && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-bold text-accent-hover">
            {circle.role}
          </span>
        )}
      </div>

      {footer}
    </div>
  );
}

export default function StudyCircles() {
  const [tab, setTab] = useState("mine");

  const [myCircles, setMyCircles] = useState([]);
  const [myCirclesLoading, setMyCirclesLoading] = useState(true);
  const [myCirclesError, setMyCirclesError] = useState("");

  const [invites, setInvites] = useState([]);

  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createVisibility, setCreateVisibility] = useState("PRIVATE");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinCodeMessage, setJoinCodeMessage] = useState({ text: "", isError: false });
  const [joiningByCode, setJoiningByCode] = useState(false);

  const [requestedIds, setRequestedIds] = useState(new Set());

  const loadMyCircles = async () => {
    try {
      setMyCirclesLoading(true);
      setMyCirclesError("");
      const response = await api.get("/circles/mine");
      setMyCircles(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setMyCirclesError(
        err.response?.data?.message || "Unable to load your Study Circles."
      );
    } finally {
      setMyCirclesLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const response = await api.get("/circles/invites/mine");
      setInvites(Array.isArray(response.data) ? response.data : []);
    } catch {
      // Non-critical for the page to still function.
    }
  };

  const loadDiscover = async (search) => {
    try {
      setDiscoverLoading(true);
      setDiscoverError("");
      const response = await api.get("/circles/discover", {
        params: search ? { search } : {},
      });
      setDiscoverResults(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setDiscoverError(
        err.response?.data?.message || "Unable to load public circles."
      );
    } finally {
      setDiscoverLoading(false);
    }
  };

  useEffect(() => {
    loadMyCircles();
    loadInvites();
  }, []);

  useEffect(() => {
    if (tab === "discover") {
      loadDiscover(discoverSearch);
    }
  }, [tab]);

  const submitDiscoverSearch = (e) => {
    e.preventDefault();
    loadDiscover(discoverSearch);
  };

  const createCircle = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (!createName.trim()) {
      setCreateError("Please give your circle a name.");
      return;
    }

    try {
      setCreating(true);
      await api.post("/circles", {
        name: createName.trim(),
        courseCode: createCourseCode.trim(),
        description: createDescription.trim(),
        visibility: createVisibility,
      });

      setCreateName("");
      setCreateCourseCode("");
      setCreateDescription("");
      setCreateVisibility("PRIVATE");
      setShowCreateForm(false);
      loadMyCircles();
    } catch (err) {
      setCreateError(
        err.response?.data?.message || "Unable to create this circle."
      );
    } finally {
      setCreating(false);
    }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    setJoinCodeMessage({ text: "", isError: false });

    if (!joinCode.trim()) return;

    try {
      setJoiningByCode(true);
      const response = await api.post("/circles/join-by-code", {
        joinCode: joinCode.trim(),
      });
      setJoinCodeMessage({ text: response.data?.message || "Joined!", isError: false });
      setJoinCode("");
      loadMyCircles();
    } catch (err) {
      setJoinCodeMessage({
        text: err.response?.data?.message || "Unable to join with that code.",
        isError: true,
      });
    } finally {
      setJoiningByCode(false);
    }
  };

  const requestToJoin = async (circleId) => {
    try {
      await api.post(`/circles/${circleId}/join-requests`);
      setRequestedIds((current) => new Set(current).add(circleId));
    } catch (err) {
      window.alert(
        err.response?.data?.message || "Unable to request to join this circle."
      );
    }
  };

  const respondToInvite = async (inviteId, accept) => {
    try {
      await api.post(`/circles/invites/${inviteId}/${accept ? "accept" : "decline"}`);
      setInvites((current) => current.filter((inv) => inv.id !== inviteId));
      if (accept) loadMyCircles();
    } catch (err) {
      window.alert(err.response?.data?.message || "Unable to update this invite.");
    }
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-accent">STUDY TOGETHER</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Study Circles
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create or join a group to chat, share materials, and generate
              flashcards together.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover"
          >
            {showCreateForm ? "Cancel" : "+ Create Circle"}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={createCircle}
            className="mb-6 grid gap-4 rounded-3xl border border-accent-soft bg-accent-soft/40 p-5 sm:p-7"
          >
            <h2 className="text-lg font-black text-slate-900">
              Create a Study Circle
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="MBC201 Revision"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Course / Subject
                </label>
                <input
                  type="text"
                  value={createCourseCode}
                  onChange={(e) => setCreateCourseCode(e.target.value)}
                  placeholder="MBC201"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Description
              </label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
                placeholder="What is this circle for?"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Visibility
              </label>
              <div className="mt-2 flex gap-3">
                {["PRIVATE", "PUBLIC"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCreateVisibility(option)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                      createVisibility === option
                        ? "border-accent bg-accent text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option === "PRIVATE" ? "Private" : "Public"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {createVisibility === "PRIVATE"
                  ? "Only people you invite or who have the join code can join."
                  : "Anyone can find this circle and request to join — you or a moderator approve requests."}
              </p>
            </div>

            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-fit rounded-xl bg-accent px-5 py-3 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Circle"}
            </button>
          </form>
        )}

        <form
          onSubmit={joinByCode}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-700">
              Have a join code?
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7P2QXN"
              className="mt-1.5 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold uppercase tracking-wider outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={joiningByCode || !joinCode.trim()}
            className="rounded-xl border border-accent-soft px-4 py-2.5 text-sm font-bold text-accent-hover hover:bg-accent-soft disabled:opacity-50"
          >
            {joiningByCode ? "Joining..." : "Join Circle"}
          </button>
          {joinCodeMessage.text && (
            <p
              className={`w-full text-xs font-semibold ${
                joinCodeMessage.isError ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {joinCodeMessage.text}
            </p>
          )}
        </form>

        {invites.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-black text-amber-900">
              Pending Invites
            </h2>
            <div className="mt-3 space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3"
                >
                  <div className="text-sm">
                    <span className="font-bold text-slate-900">
                      {invite.circle?.name}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      — invited by {invite.invitedByUser?.username}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToInvite(invite.id, true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToInvite(invite.id, false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 flex gap-2 border-b border-slate-200">
          {[
            { key: "mine", label: "My Circles" },
            { key: "discover", label: "Discover" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                tab === t.key
                  ? "border-accent text-accent-hover"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "mine" ? (
          myCirclesLoading ? (
            <div className="animate-pulse rounded-3xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
              Loading your circles...
            </div>
          ) : myCirclesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {myCirclesError}
            </div>
          ) : myCircles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
              >
                <UsersIcon size={32} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-900">
                No Study Circles yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Create one, join with a code, or browse public circles under
                Discover.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {myCircles.map((circle) => (
                <Link key={circle.id} to={`/circles/${circle.id}`}>
                  <CircleCard circle={circle} />
                </Link>
              ))}
            </div>
          )
        ) : (
          <div>
            <form onSubmit={submitDiscoverSearch} className="mb-4 flex gap-2">
              <input
                type="text"
                value={discoverSearch}
                onChange={(e) => setDiscoverSearch(e.target.value)}
                placeholder="Search by circle name or course code..."
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Search
              </button>
            </form>

            {discoverLoading ? (
              <div className="animate-pulse rounded-3xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                Loading public circles...
              </div>
            ) : discoverError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {discoverError}
              </div>
            ) : discoverResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
                No public circles found.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {discoverResults.map((circle) => {
                  const requested = requestedIds.has(circle.id) || circle.hasPendingRequest;
                  return (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      footer={
                        <div className="mt-4">
                          {circle.isMember ? (
                            <Link
                              to={`/circles/${circle.id}`}
                              className="block w-full rounded-xl bg-accent py-2.5 text-center text-xs font-bold text-white hover:bg-accent-hover"
                            >
                              Open Circle
                            </Link>
                          ) : requested ? (
                            <span className="block w-full rounded-xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-500">
                              Request Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => requestToJoin(circle.id)}
                              className="block w-full rounded-xl border border-accent-soft py-2.5 text-center text-xs font-bold text-accent-hover hover:bg-accent-soft"
                            >
                              Request to Join
                            </button>
                          )}
                          <p className="mt-2 text-center text-[10px] text-slate-400">
                            by {circle.ownerUsername}
                          </p>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
