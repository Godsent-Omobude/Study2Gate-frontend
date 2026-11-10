import { useState } from "react";
import api from "../../api/api";
import { Eye, EyeOff } from "lucide-react";
import PasswordRequirementsChecklist from "../../components/PasswordRequirementsChecklist";
import { isPasswordValid } from "../../utils/passwordRequirements";
import { useSettings } from "./SettingsContext";
import FingerprintSettings from "../../components/FingerprintSettings";

export default function SettingsPassword() {
  const { showMessage, showError, saving, setSaving } = useSettings();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  const changePassword = async (event) => {
    event.preventDefault();

    if (!isPasswordValid(newPassword)) {
      showError("New password does not meet the requirements below.");
      return;
    }

    try {
      setSaving(true);
      await api.patch("/settings/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      showMessage("Password changed successfully.");
    } catch (err) {
      showError(err.response?.data?.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <FingerprintSettings />
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">Change password</h2>
      <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <input
            type={showCurrentPassword ? "text" : "password"}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
          >
            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            required
            minLength={12}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setNewPasswordFocused(true)}
            placeholder="New password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            aria-label={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          {newPasswordFocused && (
            <PasswordRequirementsChecklist password={newPassword} />
          )}
        </div>
        <button
          disabled={saving || !isPasswordValid(newPassword)}
          className="w-fit rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          Change password
        </button>
      </form>
    </section>
    </>
  );
}
