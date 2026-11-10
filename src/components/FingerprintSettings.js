import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import api from "../api/api";
import {
  clearLocalFingerprint,
  disableFingerprint,
  enrollFingerprint,
  getLocalDeviceId,
  isFingerprintSupported,
} from "../native/biometric";
import { useSettings } from "../pages/settings/SettingsContext";

const formatRelative = (value) => {
  if (!value) return "never";
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// Lives on Settings → Password and security. Turning fingerprint on only
// works inside the Android app; the list of enrolled phones (and removing
// them) works from any browser.
export default function FingerprintSettings() {
  const { showMessage, showError } = useSettings();
  const [supported, setSupported] = useState(null);
  const [devices, setDevices] = useState(null);
  const [localDeviceId, setLocalDeviceId] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [isSupported, deviceId, response] = await Promise.all([
        isFingerprintSupported(),
        getLocalDeviceId(),
        api.get("/auth/biometric"),
      ]);
      setSupported(isSupported);
      setLocalDeviceId(deviceId);
      setDevices(response.data.devices || []);
    } catch (err) {
      showError(err.response?.data?.message || "Unable to load fingerprint login settings.");
      setSupported(false);
      setDevices([]);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, []);

  const enabledHere = Boolean(localDeviceId) && Boolean(devices?.some((device) => device.id === localDeviceId));

  const handleEnable = async (event) => {
    event.preventDefault();

    try {
      setBusy(true);
      await enrollFingerprint(password);
      setPassword("");
      await load();
      showMessage("Fingerprint login is on for this phone.");
    } catch (err) {
      if (err.cancelled) return;
      showError(err.response?.data?.message || err.message || "Couldn't turn on fingerprint login.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisableHere = async () => {
    try {
      setBusy(true);
      await disableFingerprint();
      await load();
      showMessage("Fingerprint login is off for this phone.");
    } catch (err) {
      showError(err.response?.data?.message || "Unable to turn off fingerprint login.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (device) => {
    setRemovingId(device.id);
    try {
      await api.delete(`/auth/biometric/${device.id}`);
      if (device.id === localDeviceId) await clearLocalFingerprint();
      setDevices((current) => current.filter((item) => item.id !== device.id));
      if (device.id === localDeviceId) setLocalDeviceId(null);
      showMessage("Fingerprint login removed for that phone.");
    } catch (err) {
      showError(err.response?.data?.message || "Unable to remove that phone.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="mb-5 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Fingerprint size={22} className="text-[var(--accent)]" aria-hidden="true" />
        <h2 className="text-xl font-black text-slate-900">Fingerprint login</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Sign in to the Study2Gate app with your fingerprint instead of typing your password. Changing or
        resetting your password turns it off everywhere.
      </p>

      {supported === null || devices === null ? (
        <p className="mt-5 text-sm text-slate-400">Loading...</p>
      ) : (
        <>
          {supported && !enabledHere && (
            <form onSubmit={handleEnable} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                disabled={busy || !password}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Turning on..." : "Turn on"}
              </button>
            </form>
          )}

          {supported && enabledHere && (
            <button
              onClick={handleDisableHere}
              disabled={busy}
              className="mt-5 rounded-xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Turning off..." : "Turn off on this phone"}
            </button>
          )}

          {!supported && (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Open the Study2Gate app on an Android phone with a fingerprint set up to turn this on.
            </p>
          )}

          {devices.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phones with fingerprint login</p>
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-800">{device.deviceName || "Android phone"}</p>
                      {device.id === localDeviceId && (
                        <span className="text-[10px] font-black uppercase text-[var(--accent)]">This phone</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Last used {formatRelative(device.lastUsedAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(device)}
                    disabled={removingId === device.id}
                    className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === device.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
