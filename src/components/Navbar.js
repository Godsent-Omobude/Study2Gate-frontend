import React from "react";
import { Capacitor } from "@capacitor/core";
import { Menu } from "lucide-react";
import useProfilePicture from "../hooks/useProfilePicture";

// The compact "--native" layout (see index.css) only applies inside the
// Capacitor app; the website and PWA keep the regular spacious navbar.
const isNativeApp = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

export default function Navbar({ onMenuOpen, children }) {
  const userName = localStorage.getItem("fullName") || "Student";
  const profileInitial = (userName.trim()[0] || "S").toUpperCase();
  const profilePictureUrl = useProfilePicture();

  return (
    <nav className={`study2gate-navbar${isNativeApp ? " study2gate-navbar--native" : ""} sticky top-0 z-30 h-[calc(72px+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b border-slate-200/90 bg-white/95 px-4 shadow-[0_1px_12px_rgba(15,23,42,0.05)] backdrop-blur sm:px-6`}>
      <div className="study2gate-navbar__inner mx-auto flex h-full w-full min-w-0 items-center justify-between">
        <div className="study2gate-navbar__brand-group flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
            aria-expanded={false}
            className="study2gate-navbar__menu group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-accent-soft hover:bg-accent-soft hover:text-accent active:scale-95"
          >
            <Menu className="h-[25px] w-[25px] transition group-hover:scale-95" strokeWidth={2} />
          </button>

          <div className="study2gate-navbar__brand min-w-0 truncate whitespace-nowrap text-[25px] font-black tracking-[-0.04em] text-accent sm:text-[28px]">
            Study2Gate
          </div>
        </div>

        <div className="study2gate-navbar__actions ml-2 flex shrink-0 items-center gap-3">
          {children}

          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={`${userName}'s profile`}
              title={userName}
              aria-label={`Logged in as ${userName}`}
              className="study2gate-navbar__profile h-11 w-11 shrink-0 rounded-full object-cover shadow-md shadow-accent-soft ring-4 ring-accent-soft"
            />
          ) : (
            <div
              className="study2gate-navbar__profile flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-black text-white shadow-md shadow-accent-soft ring-4 ring-accent-soft"
              title={userName}
              aria-label={`Logged in as ${userName}`}
            >
              {profileInitial}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
