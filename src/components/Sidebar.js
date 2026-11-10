import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import api from "../api/api";
import { disconnectStudySocket } from "../api/socket";
import usePushMessaging from "../hooks/usePushMessaging";
import useProfilePicture from "../hooks/useProfilePicture";
import { unregisterPushDevice } from "../api/pushNotifications";
import { revokeLocalToken, isNativePushAvailable } from "../firebase/messaging";
import { clearWidgetToken } from "../native/widgetToken";
import study2gateLogo from "../assets/study2gate-logo.png";
const navItems = [
  { to: "/", label: "Dashboard", icon: "home", end: true },
  { to: "/materials", label: "My Materials", icon: "folder" },
  { to: "/upload#upload-section", label: "Upload Material", icon: "upload" },
  { to: "/generate-flashcards", label: "Generate Flashcards", icon: "spark" },
  { to: "/my-flashcards", label: "My Flashcards", icon: "cards" },
  { to: "/circles", label: "Study Circles", icon: "circle" },
];

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "home") return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>;
  if (name === "folder") return <svg {...common}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M3.5 9h17" /></svg>;
  if (name === "upload") return <svg {...common}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 1.4 4.1L17.5 9l-4.1 1.4L12 14.5l-1.4-4.1L6.5 9l4.1-1.9z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></svg>;
  if (name === "cards") return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /><path d="M3 7v10a2 2 0 0 0 2 2" /></svg>;
  if (name === "circle") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="7" r="2.5" /><path d="M15 13.5c2.5.4 4.5 2.6 4.5 5.5" /></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.1A1.7 1.7 0 0 0 7.6 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.2l.1.1A1.7 1.7 0 0 0 11 6a1.7 1.7 0 0 0 1-1.5V4h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.1 1z" /></svg>;
  if (name === "admin") return <svg {...common}><path d="M12 3 4 7v5c0 4.5 3.1 7.6 8 9 4.9-1.4 8-4.5 8-9V7z" /><path d="m9 12 2 2 4-4" /></svg>;
  return null;
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Student";
  const username = localStorage.getItem("username") || "";
  const role = localStorage.getItem("role") || "student";
  const isAdmin = role === "admin";
  const profilePictureUrl = useProfilePicture();

  // Keeps this device's FCM registration current for the lifetime of the
  // session. Present here (rather than in App.js) because Sidebar is
  // mounted on every authenticated page via ProtectedLayout.
  usePushMessaging();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = () => {
    setLoggingOut(true);

    // Web: only this browser's push registration is removed — other
    // devices/browsers signed into the same account keep receiving
    // pushes, since logging out here says nothing about those sessions.
    //
    // Native app: the registration is deliberately kept, so streak
    // warnings and Study Circle messages still reach the phone while
    // signed out (like banking apps). If a different account signs in on
    // this phone, registerDevice() reassigns the token to that account;
    // "Turn off" in Settings still removes it completely.
    const fcmToken = localStorage.getItem("fcmToken");
    const cleanupPush = fcmToken && !isNativePushAvailable()
      ? unregisterPushDevice(fcmToken).catch(() => {}).then(() => revokeLocalToken())
      : Promise.resolve();

    // The auth cookie is httpOnly, so client-side JS can't clear it —
    // without this call the cookie would keep authenticating requests
    // even after localStorage.clear().
    Promise.allSettled([api.post("/auth/logout"), cleanupPush, clearWidgetToken()]).finally(() => {
      // The Socket.IO connection is authenticated independently from React
      // state. Close it before leaving the authenticated area so the old
      // session cannot continue receiving real-time events after logout.
      disconnectStudySocket();
      localStorage.clear();
      navigate("/login");
    });
  };

  return (
    <>
      {/* Backdrop is mobile-only — on desktop the sidebar is permanently docked. */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex h-[calc(76px+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-slate-100 px-5 pt-[env(safe-area-inset-top,0px)]">
          <div className="logo-mark flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <img
              src={study2gateLogo}
              alt="Study2Gate logo"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="text-[21px] font-black tracking-[-0.04em] text-slate-900">
            Study<span className="logo-mark text-brand-blue">2Gate</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Profile"
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-accent-soft"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-black text-white shadow-lg shadow-accent-soft">
                {(fullName[0] || "S").toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{fullName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{username || "Student account"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Study
          </p>

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-accent-soft text-accent-hover"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive
                          ? "bg-accent-soft text-accent-hover"
                          : "bg-slate-100 text-slate-400 group-hover:text-accent"
                      }`}
                    >
                      <Icon name={item.icon} />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <p className="mt-8 px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Account
          </p>

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-accent-soft text-accent-hover"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Icon name="admin" />
              </span>
              Admin Workspace
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-accent-soft text-accent-hover"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`
            }
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Icon name="settings" />
            </span>
            Settings
          </NavLink>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 rounded-2xl border border-accent-soft bg-accent-soft p-4">
            <p className="text-xs font-black text-slate-800">Study smarter 🚀</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Keep your study streak alive and make every session count.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !loggingOut && setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900">Log out?</h3>
            <p className="mt-1 text-sm text-slate-500">
              You'll need to sign in again to access your account on this device.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loggingOut && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
