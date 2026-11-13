import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  GraduationCap,
  Download,
  User,
  Settings as SettingsIcon,
  RefreshCw,
  Lock,
  Globe,
  Database,
  Megaphone,
} from "lucide-react";
import { UsersIcon, AdminShieldIcon, FilesIcon, FlashcardsIcon } from "../../components/icons/AdminIcons";

// Most icons here are still plain Lucide glyphs (status ticks, nav icons) —
// only the four stat-card concepts (users, admins, files, flashcard sets)
// got the custom accent-reactive treatment, as a scoped prototype rather
// than a full icon-system rewrite.
const LUCIDE_ICONS = {
  "check-circle": CheckCircle2,
  "alert-triangle": AlertTriangle,
  "bar-chart": BarChart3,
  "graduation-cap": GraduationCap,
  download: Download,
  user: User,
  settings: SettingsIcon,
  refresh: RefreshCw,
  lock: Lock,
  globe: Globe,
  database: Database,
  megaphone: Megaphone,
};

export function Icon({ name, className = "h-5 w-5" }) {
  const Component = LUCIDE_ICONS[name];
  if (!Component) return null;
  return <Component className={className} aria-hidden="true" />;
}

// Icon + label pairs for the four stat cards. Colored via the wrapping
// element's `style={{ color: 'var(--accent)' }}` in StatCard below, not a
// Tailwind class — arbitrary-value/CSS-variable classes here have silently
// failed to compile before (see the notification toggle fix), so dynamic,
// accent-driven color always goes through inline style in this codebase.
const STAT_ICONS = {
  users: UsersIcon,
  shield: AdminShieldIcon,
  folder: FilesIcon,
  layers: FlashcardsIcon,
  cards: FlashcardsIcon,
};

export function StatCard({ icon, title, value }) {
  const CustomIcon = STAT_ICONS[icon];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
      >
        {CustomIcon ? <CustomIcon size={18} /> : <Icon name={icon} className="h-5 w-5" />}
      </div>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">
        {value === null || value === undefined ? "—" : value}
      </p>
    </div>
  );
}

export function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase ${
        isAdmin ? "bg-accent-soft text-accent" : "bg-accent-soft text-accent-hover"
      }`}
    >
      {role}
    </span>
  );
}

export function StandingBadge({ tone, children }) {
  const tones = {
    suspended: "bg-orange-100 text-orange-700",
    terminated: "bg-red-100 text-red-700",
    warned: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
        tones[tone] || "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

const FILE_COPYRIGHT_STYLES = {
  PENDING: "bg-slate-100 text-slate-700",
  CLEARED: "bg-green-100 text-green-700",
  REVIEW_REQUIRED: "bg-amber-100 text-amber-700",
  RESTRICTED: "bg-orange-100 text-orange-700",
  REMOVED: "bg-red-100 text-red-700",
  REJECTED: "bg-slate-200 text-slate-600",
};

// Shown in File Management so a hard-delete there is never done blind to
// the fact this file might already be mid-way through the reversible
// Copyright Review flow.
export function FileCopyrightBadge({ status }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
        FILE_COPYRIGHT_STYLES[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function SectionHeader({ title, description, onRefresh, loading }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl font-black text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="self-start inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

export function SystemCard({ icon, title, value, healthy }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`w-3 h-3 rounded-full ${healthy ? "bg-green-500" : "bg-slate-400"}`} />
        <p className="font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function ApiEndpointGroup({ title, children }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function ApiEndpoint({ method, path }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <span className="text-[10px] font-black text-slate-500 mr-2">{method}</span>
      <code className="text-xs text-slate-700">{path}</code>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-10 text-center text-slate-500">
      {text}
    </div>
  );
}
