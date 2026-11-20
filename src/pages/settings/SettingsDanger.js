import { useState } from "react";
import api from "../../api/api";
import { Eye, EyeOff } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { clearFlashcardCache } from "../../utils/flashcardCache";

export default function SettingsDanger() {
  const { showError, saving, setSaving } = useSettings();
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const deleteAccount = async (event) => {
    event.preventDefault();

    if (deleteConfirmation !== "I agree to delete my account") {
      showError('Type exactly "I agree to delete my account".');
      return;
    }

    if (!window.confirm("This permanently deletes your Study2Gate account. Continue?")) {
      return;
    }

    try {
      setSaving(true);
      await api.delete("/settings/account", {
        data: {
          confirmation: deleteConfirmation,
          password: deletePassword,
        },
      });

      clearFlashcardCache();
      localStorage.clear();
      window.location.href = "/register";
    } catch (err) {
      showError(err.response?.data?.message || "Unable to delete account.");
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-xl font-black text-red-800">Account deletion</h2>
      <p className="mt-2 text-sm leading-6 text-red-700">
        This permanently deletes your account, flashcards, uploaded-material
        records and stored profile picture.
      </p>
      <form onSubmit={deleteAccount} className="mt-5 space-y-4">
        <input
          value={deleteConfirmation}
          onChange={(e) => setDeleteConfirmation(e.target.value)}
          placeholder="I agree to delete my account"
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
        />
        <div className="relative">
          <input
            type={showDeletePassword ? "text" : "password"}
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-red-500"
          />
          <button
            type="button"
            onClick={() => setShowDeletePassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            aria-label={showDeletePassword ? "Hide password" : "Show password"}
          >
            {showDeletePassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button
          disabled={saving}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
        >
          Confirm deletion
        </button>
      </form>
    </section>
  );
}
