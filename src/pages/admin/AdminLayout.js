import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AdminProvider, useAdmin } from "./AdminContext";
import { Icon } from "./AdminUI";
import { AdminShieldIcon, UsersIcon } from "../../components/icons/AdminIcons";

const NAV_ITEMS = [
  { to: "/admin", end: true, icon: "bar-chart", label: "Overview" },
  { to: "/admin/users", icon: "users", label: "User Management" },
  { to: "/admin/files", icon: "folder", label: "File Management" },
  { to: "/admin/copyright", icon: "shield", label: "Copyright Review" },
  { to: "/admin/announcements", icon: "megaphone", label: "Announcements" },
  { to: "/admin/developer", icon: "settings", label: "Developer Controls" },
];

// The nav reuses the same custom icons as the stat cards (see AdminUI.js)
// for Users and Copyright, so the pill row and the stat grid feel like one
// family rather than two different icon sets glued together.
function NavIcon({ name }) {
  if (name === "users") return <UsersIcon size={16} />;
  if (name === "shield") return <AdminShieldIcon size={16} />;
  return <Icon name={name} className="h-4 w-4" />;
}

function AdminNavButton({ to, end, icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${
          isActive
            ? "text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
          : undefined
      }
    >
      <NavIcon name={icon} />
      {label}
    </NavLink>
  );
}

function AdminShell() {
  const { adminInfo, message, error, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
          >
            <AdminShieldIcon size={28} />
          </div>
          <p className="font-bold text-slate-700">Loading Study2Gate controls</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: "var(--accent)" }}
              >
                Restricted area
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Admin workspace</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage Study2Gate users, uploaded materials and system activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full text-white flex items-center justify-center font-black"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {(adminInfo?.fullName || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{adminInfo?.fullName || "Administrator"}</p>
                <p className="text-xs text-slate-500">{adminInfo?.username || ""}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[10px] font-black uppercase">
                  Administrator
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-6 py-7">
        {message && (
          <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
            <Icon name="check-circle" className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            <Icon name="alert-triangle" className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-7 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {NAV_ITEMS.map((item) => (
            <AdminNavButton key={item.to} {...item} />
          ))}
        </div>

        <Outlet key={location.pathname} />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}
