import { useState } from "react";
import api from "../api/api";
import useBackClose from "../hooks/useBackClose";

export default function DisputeModal({ file, onClose, onSubmitted }) {
  useBackClose(true, onClose);
  const [explanation, setExplanation] = useState("");
  const [ownsWork, setOwnsWork] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [otherLawfulBasis, setOtherLawfulBasis] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileId = file.id ?? file._id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!explanation.trim()) {
      setError("Please explain why you believe you have the right to use this material.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/copyright/files/${fileId}/dispute`, {
        explanation,
        ownsWork,
        hasPermission,
        otherLawfulBasis,
      });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit your dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black text-slate-900">Dispute this decision</h3>
        <p className="mt-1 text-sm text-slate-500">
          "{file.title}" was {file.copyrightStatus === "REMOVED" ? "removed" : "restricted"} following a
          copyright review. Explain why you believe you have the right to use this material — an
          administrator will review your dispute. This does not automatically restore the material.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-bold text-slate-700">Your explanation</span>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
              placeholder="Why do you believe this material can lawfully be on Study2Gate?"
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={ownsWork} onChange={(e) => setOwnsWork(e.target.checked)} />
              I own this work
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={hasPermission} onChange={(e) => setHasPermission(e.target.checked)} />
              I have permission from the rights holder to share it
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-slate-700">Other lawful basis (optional)</span>
            <input
              type="text"
              value={otherLawfulBasis}
              onChange={(e) => setOtherLawfulBasis(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
              placeholder="e.g. This is my own lecture notes, not the source text"
            />
          </label>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
