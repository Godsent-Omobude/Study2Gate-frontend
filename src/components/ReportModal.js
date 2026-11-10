import { useState } from "react";
import api from "../api/api";
import useBackClose from "../hooks/useBackClose";

export default function ReportModal({ file, onClose, onSubmitted }) {
  useBackClose(true, onClose);
  const [complainantName, setComplainantName] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [copyrightedWork, setCopyrightedWork] = useState("");
  const [explanation, setExplanation] = useState("");
  const [ownershipEvidence, setOwnershipEvidence] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const fileId = file.id ?? file._id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!complainantName.trim() || !complainantEmail.trim() || !copyrightedWork.trim() || !explanation.trim()) {
      setError("Please fill in your name, email, the copyrighted work, and an explanation.");
      return;
    }
    if (!declarationAccepted) {
      setError("Please confirm this information is accurate to the best of your knowledge.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/copyright/files/${fileId}/report`, {
        complainantName,
        complainantEmail,
        complainantPhone,
        copyrightedWork,
        infringingLocation: file.title,
        explanation,
        ownershipEvidence,
        declarationAccepted,
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit this report.");
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
        {done ? (
          <div className="text-center py-6">
            <p className="text-lg font-black text-slate-900">Report submitted</p>
            <p className="mt-2 text-sm text-slate-500">
              Study2Gate's administrators will review your report. Thank you.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-hover"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-black text-slate-900">Report copyright infringement</h3>
            <p className="mt-1 text-sm text-slate-500">
              Reporting "{file.title}". Submitting a report does not automatically remove the material —
              a Study2Gate administrator will review it.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-bold text-slate-700">Your name</span>
                <input
                  type="text"
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-slate-700">Contact email</span>
                  <input
                    type="email"
                    value={complainantEmail}
                    onChange={(e) => setComplainantEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-slate-700">Phone (optional)</span>
                  <input
                    type="text"
                    value={complainantPhone}
                    onChange={(e) => setComplainantPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-bold text-slate-700">The copyrighted work</span>
                <input
                  type="text"
                  value={copyrightedWork}
                  onChange={(e) => setCopyrightedWork(e.target.value)}
                  placeholder="Title of the original work you own or represent"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-bold text-slate-700">Explanation</span>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  placeholder="How does this Study2Gate material infringe your copyright?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-bold text-slate-700">Evidence of ownership (optional)</span>
                <textarea
                  value={ownershipEvidence}
                  onChange={(e) => setOwnershipEvidence(e.target.value)}
                  rows={2}
                  placeholder="Links, registration numbers, or other information showing you own/represent this work"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-soft0"
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                I declare that the information in this report is accurate to the best of my knowledge.
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
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
