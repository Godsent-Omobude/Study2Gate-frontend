import { useCallback, useEffect, useState } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { useAdmin } from "./AdminContext";
import { EmptyState, SectionHeader } from "./AdminUI";
import {
  deleteAnnouncement,
  fetchAnnouncementHistory,
  sendAnnouncement,
  updateAnnouncement,
} from "../../api/announcements";

// Keep in step with the limits in the backend's announcementsController.js.
const TITLE_MAX = 100;
const BODY_MAX = 500;
const LABEL_MAX = 30;

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never", days: null },
  { value: "1", label: "In 1 day", days: 1 },
  { value: "3", label: "In 3 days", days: 3 },
  { value: "7", label: "In 7 days", days: 7 },
  { value: "30", label: "In 30 days", days: 30 },
];

const EMPTY_FORM = {
  title: "",
  body: "",
  linkUrl: "",
  linkLabel: "",
  expiry: "never",
  sendPush: false,
};

const formatDate = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const statusOf = (announcement) => {
  if (!announcement.active) return { label: "Retired", className: "bg-slate-100 text-slate-600" };
  if (announcement.expiresAt && new Date(announcement.expiresAt) <= new Date()) {
    return { label: "Expired", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "Live", className: "bg-green-100 text-green-700" };
};

const pushSummary = (announcement) => {
  if (!announcement.sendPush) return null;
  if (announcement.pushedAt) {
    return `Push: ${announcement.pushDelivered} delivered${
      announcement.pushFailed ? `, ${announcement.pushFailed} failed` : ""
    }`;
  }
  const ageMs = Date.now() - new Date(announcement.createdAt).getTime();
  return ageMs < 10 * 60 * 1000 ? "Push: sending…" : "Push: no result recorded";
};

function Preview({ form }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
        What users will see
      </p>
      <div className="mx-auto w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-lg">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
        >
          <Megaphone className="h-5 w-5" />
        </div>
        <p className="mt-3 break-words font-black text-slate-900">
          {form.title.trim() || "Your title"}
        </p>
        <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-6 text-slate-500">
          {form.body.trim() || "Your message appears here."}
        </p>
        <div
          className="mt-4 rounded-xl py-2.5 text-sm font-black text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {form.linkUrl.trim() ? form.linkLabel.trim() || "Learn more" : "Got it"}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const { stats, showMessage, showError, clearMessages, handleApiError } = useAdmin();

  const [form, setForm] = useState(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      setHistory(await fetchAnnouncementHistory());
    } catch (err) {
      handleApiError(err, "Unable to load announcements.");
    } finally {
      setLoadingHistory(false);
    }
  }, [handleApiError]);

  useEffect(() => {
    loadHistory();
  }, []);

  const setField = (name, value) => {
    setConfirming(false);
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const titleOk = form.title.trim().length > 0 && form.title.length <= TITLE_MAX;
  const bodyOk = form.body.trim().length > 0 && form.body.length <= BODY_MAX;
  const canReview = titleOk && bodyOk && !sending;

  const handleSend = async () => {
    clearMessages();
    setSending(true);

    const option = EXPIRY_OPTIONS.find((item) => item.value === form.expiry);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      sendPush: form.sendPush,
    };
    if (form.linkUrl.trim()) {
      payload.linkUrl = form.linkUrl.trim();
      payload.linkLabel = form.linkLabel.trim();
    }
    if (option?.days) {
      payload.expiresAt = new Date(Date.now() + option.days * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      await sendAnnouncement(payload);
      showMessage(
        form.sendPush
          ? "Announcement sent. The popup is live now and push notifications are going out."
          : "Announcement sent. Users will see it the next time they open the app."
      );
      setForm(EMPTY_FORM);
      setConfirming(false);
      await loadHistory();
    } catch (err) {
      // Validation, rate limit and duplicate messages come from the server
      // and are written for the admin, so show them as they are.
      if (err.response?.status >= 400 && err.response?.status < 500 && err.response?.status !== 401 && err.response?.status !== 403) {
        showError(err.response?.data?.message || "Could not send the announcement.");
      } else {
        handleApiError(err, "Could not send the announcement.");
      }
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const toggleActive = async (announcement) => {
    clearMessages();
    setBusyId(announcement.id);
    try {
      await updateAnnouncement(announcement.id, { active: !announcement.active });
      showMessage(announcement.active ? "Announcement retired." : "Announcement is live again.");
      await loadHistory();
    } catch (err) {
      handleApiError(err, "Could not update the announcement.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (announcement) => {
    if (
      !window.confirm(
        `Delete "${announcement.title}"? It disappears for everyone, including from their notification bell. This cannot be undone.`
      )
    ) {
      return;
    }
    clearMessages();
    setBusyId(announcement.id);
    try {
      await deleteAnnouncement(announcement.id);
      showMessage("Announcement deleted.");
      await loadHistory();
    } catch (err) {
      handleApiError(err, "Could not delete the announcement.");
    } finally {
      setBusyId(null);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <SectionHeader
        title="Announcements"
        description="Send one message to every user. It appears as a popup the next time they open the app."
        onRefresh={loadHistory}
        loading={loadingHistory}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="mb-4 font-black text-slate-800">New announcement</h3>

          <label className="block text-sm font-bold text-slate-700" htmlFor="ann-title">
            Title
          </label>
          <input
            id="ann-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="e.g. Study2Gate is now live!"
            className={`${inputClass} mt-1.5`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {form.title.length}/{TITLE_MAX}
          </p>

          <label className="mt-3 block text-sm font-bold text-slate-700" htmlFor="ann-body">
            Message
          </label>
          <textarea
            id="ann-body"
            value={form.body}
            onChange={(e) => setField("body", e.target.value)}
            maxLength={BODY_MAX}
            rows={5}
            placeholder="What do you want every user to know?"
            className={`${inputClass} mt-1.5 resize-y`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {form.body.length}/{BODY_MAX}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="block text-sm font-bold text-slate-700" htmlFor="ann-link">
                Link (optional)
              </label>
              <input
                id="ann-link"
                value={form.linkUrl}
                onChange={(e) => setField("linkUrl", e.target.value)}
                placeholder="/materials or https://…"
                autoCapitalize="none"
                autoCorrect="off"
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-bold text-slate-700" htmlFor="ann-label">
                Button text
              </label>
              <input
                id="ann-label"
                value={form.linkLabel}
                onChange={(e) => setField("linkLabel", e.target.value)}
                maxLength={LABEL_MAX}
                placeholder="Learn more"
                disabled={!form.linkUrl.trim()}
                className={`${inputClass} mt-1.5 disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </div>
          </div>

          <label className="mt-3 block text-sm font-bold text-slate-700" htmlFor="ann-expiry">
            Stop showing the popup
          </label>
          <select
            id="ann-expiry"
            value={form.expiry}
            onChange={(e) => setField("expiry", e.target.value)}
            className={`${inputClass} mt-1.5`}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={form.sendPush}
              onChange={(e) => setField("sendPush", e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-800">Also send a push notification</span>
              <br />
              Reaches people who haven't opened the app, but only those who allowed notifications and
              kept Announcements switched on. Everyone else still sees the popup.
            </span>
          </label>

          {!confirming ? (
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setConfirming(true);
              }}
              disabled={!canReview}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Send className="h-4 w-4" />
              Review and send
            </button>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">
                Send this to all {stats?.users ?? ""} users?
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {form.sendPush
                  ? "The popup and the push notification can't be recalled once sent. You can retire it afterwards to stop the popup."
                  : "You can retire it afterwards to stop the popup."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {sending ? "Sending..." : "Send now"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Preview form={form} />
        </div>
      </div>

      <h3 className="mb-3 mt-9 font-black text-slate-800">History</h3>
      {loadingHistory && history.length === 0 ? (
        <EmptyState text="Loading announcements..." />
      ) : history.length === 0 ? (
        <EmptyState text="No announcements sent yet." />
      ) : (
        <div className="space-y-3">
          {history.map((announcement) => {
            const status = statusOf(announcement);
            const push = pushSummary(announcement);
            const busy = busyId === announcement.id;
            return (
              <div
                key={announcement.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(announcement.createdAt)}</span>
                </div>
                <p className="mt-2 break-words font-black text-slate-800">{announcement.title}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-500">
                  {announcement.body}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Dismissed by {announcement._count?.dismissals ?? 0}
                  {push ? ` · ${push}` : ""}
                  {announcement.expiresAt ? ` · Expires ${formatDate(announcement.expiresAt)}` : ""}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(announcement)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {announcement.active ? "Retire" : "Make live again"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(announcement)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
