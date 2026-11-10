import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import useBackClose from "../hooks/useBackClose";

// Same overlay/card structure as ReportModal/DisputeModal, so it matches
// the app's existing modal design language rather than introducing a new
// one.
export default function OutOfCreditsModal({ open, onClose }) {
  const navigate = useNavigate();
  useBackClose(open, onClose);

  if (!open) return null;

  const goToUpload = () => {
    onClose?.();
    // "/upload" is the app's existing dedicated upload route (see
    // Sidebar.js) — it renders the same "Add a Resource" section as the
    // Dashboard. The hash lets that page scroll straight to it.
    navigate("/upload#upload-section");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Coins className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-lg font-black text-slate-900">
          You're out of download credits.
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Upload a document to earn 2 more download credits, then come back
          to download this material.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={goToUpload}
            className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover"
          >
            Upload Document
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
