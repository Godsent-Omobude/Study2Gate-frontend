import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Upload,
  Download,
  Flame,
  Sparkles,
  FileText,
  Link2,
  ExternalLink,
} from "lucide-react";
import api from "../api/api";
import ReportModal from "../components/ReportModal";
import OutOfCreditsModal from "../components/OutOfCreditsModal";
import useProfilePicture from "../hooks/useProfilePicture";
import { FlashcardsIcon } from "../components/icons/AdminIcons";
import { broadcastDownloadCredits, readDownloadErrorPayload } from "../utils/downloadCredits";

const isValidHttpsUrl = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [flashcardSetsTotal, setFlashcardSetsTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [streak, setStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyDays: 0,
    status: "none",
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [type, setType] = useState("Material");
  const [sourceType, setSourceType] = useState("UPLOAD");
  const [selectedFile, setSelectedFile] = useState(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: "", isError: false });
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);

  const userName = localStorage.getItem("fullName") || "Student";
  const profilePictureUrl = useProfilePicture();
  const location = useLocation();

  // Lets the "Upload Document" button in OutOfCreditsModal (and the
  // Sidebar's "/upload" link) jump straight to the upload form, from this
  // page or any other route that navigates here with the hash set.
  useEffect(() => {
    if (location.hash === "#upload-section") {
      document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const nameParts = userName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Student";
  const initials = (
    (nameParts[0]?.[0] || "S") + (nameParts[1]?.[0] || "")
  ).toUpperCase();

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { eyebrow: "Good morning", suffix: "." };
    if (hour >= 12 && hour < 17) return { eyebrow: "Good afternoon", suffix: "." };
    if (hour >= 17 && hour < 21) return { eyebrow: "Good evening", suffix: "." };
    return { eyebrow: "Studying late", suffix: "?" };
  }, []);

  const [taglineVisible, setTaglineVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTaglineVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get("/files");
      setFiles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Unable to fetch files.", error);
      setLoadError("Unable to load your materials right now. Please refresh the page.");
    }
  };

  const fetchFlashcards = async () => {
    try {
      const response = await api.get("/ai/flashcards");
      const sets = Array.isArray(response.data?.flashcardSets)
        ? response.data.flashcardSets
        : [];
      setFlashcardSetsTotal(sets.length);
      setFlashcardSets(sets.slice(0, 4));
    } catch (error) {
      console.error("Unable to fetch flashcard sets.", error);
      setLoadError("Unable to load your flashcard sets right now. Please refresh the page.");
    }
  };

  const fetchStreak = async () => {
    try {
      const response = await api.get("/ai/streak");
      if (response.data?.streak) setStreak(response.data.streak);
    } catch (error) {
      console.error("Unable to fetch study streak.", error);
      // Not surfaced via loadError: the streak panel degrades gracefully
      // to its zero-state defaults, and a banner over the whole dashboard
      // for a non-essential widget would overstate the problem.
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchFlashcards();
    fetchStreak();
  }, []);

  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    setUploadMsg({ text: "", isError: false });

    if (sourceType === "UPLOAD" && !selectedFile) {
      setUploadMsg({
        text: "Please choose a file to upload.",
        isError: true,
      });
      return;
    }

    if (sourceType === "EXTERNAL_LINK") {
      if (!externalUrl.trim()) {
        setUploadMsg({ text: "Please provide a resource URL.", isError: true });
        return;
      }
      if (!isValidHttpsUrl(externalUrl)) {
        setUploadMsg({
          text: "External resources must use a secure HTTPS URL.",
          isError: true,
        });
        return;
      }
    }

    if (!copyrightConfirmed) {
      setUploadMsg({
        text: "Please confirm that you have the right or permission to share this material.",
        isError: true,
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("courseCode", courseCode);
    formData.append("type", type);
    formData.append("sourceType", sourceType);
    formData.append("copyrightConfirmation", "true");

    if (sourceType === "UPLOAD") {
      formData.append("file", selectedFile);
    } else {
      formData.append("externalUrl", externalUrl.trim());
    }

    setIsUploading(true);

    try {
      const response = await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadMsg({
        text: response.data?.message || "Resource added successfully.",
        isError: false,
      });

      // A successful UPLOAD (not an external link) earns +2 credits;
      // the backend already returns the updated balance so the Navbar
      // badge can update immediately instead of waiting on a refetch.
      broadcastDownloadCredits(response.data?.downloadCredits);

      setTitle("");
      setDescription("");
      setCourseCode("");
      setSelectedFile(null);
      setExternalUrl("");
      setCopyrightConfirmed(false);

      const input = document.getElementById("material-file");
      if (input) input.value = "";

      fetchFiles();
    } catch (error) {
      setUploadMsg({
        text: error.response?.data?.message || "Upload failed.",
        isError: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileId, originalName) => {
    if (downloadingId === fileId) return;

    setDownloadingId(fileId);
    setDownloadedId(null);

    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.download = originalName || "study-material";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // The download route returns the post-spend balance in this header
      // so the Navbar badge updates immediately.
      broadcastDownloadCredits(response.headers?.["x-download-credits"]);

      setDownloadedId(fileId);
      fetchFiles();

      window.setTimeout(() => {
        setDownloadedId((current) => (current === fileId ? null : current));
      }, 2200);
    } catch (error) {
      const payload = await readDownloadErrorPayload(error);

      if (payload?.code === "INSUFFICIENT_CREDITS") {
        setShowOutOfCredits(true);
      } else {
        window.alert(payload?.message || "Unable to download this file.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenExternal = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const filteredFiles = useMemo(() => {
    const term = search.toLowerCase();

    return files.filter((file) => {
      const title = String(file.title || "").toLowerCase();
      const courseCode = String(file.courseCode || "").toLowerCase();
      const externalDomain = String(file.externalDomain || "").toLowerCase();

      const matchesSearch =
        title.includes(term) || courseCode.includes(term) || externalDomain.includes(term);

      const matchesFilter =
        filterType === "All" || file.type === filterType;

      const matchesSource =
        filterSource === "All" ||
        (filterSource === "Uploaded" && file.sourceType !== "EXTERNAL_LINK") ||
        (filterSource === "External" && file.sourceType === "EXTERNAL_LINK");

      return matchesSearch && matchesFilter && matchesSource;
    });
  }, [files, search, filterType, filterSource]);

  const totalDownloads = useMemo(
    () => files.reduce((total, file) => total + Number(file.downloads || 0), 0),
    [files]
  );

  // Builds the last 7 calendar days for the streak panel's day-dot row,
  // marking a day "done" if it falls inside the current streak's window.
  const streakDayDots = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
    if (lastStudy) lastStudy.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);

      let done = false;
      if (lastStudy && streak.currentStreak > 0) {
        const streakStart = new Date(lastStudy);
        streakStart.setDate(lastStudy.getDate() - (streak.currentStreak - 1));
        done = day >= streakStart && day <= lastStudy;
      }

      days.push({
        key: day.toISOString(),
        label: day.toLocaleDateString(undefined, { weekday: "narrow" }),
        isToday: day.getTime() === today.getTime(),
        done,
      });
    }

    return days;
  }, [streak]);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {loadError}
          </div>
        )}
        <section className="mb-6 overflow-hidden rounded-tl-[4px] rounded-tr-[28px] rounded-br-[4px] rounded-bl-[28px] bg-accent p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-black text-white">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-soft">
                    {timeGreeting.eyebrow}
                  </p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                    <span className="border-b-[3px] border-amber-300 pb-0.5">
                      {firstName}
                    </span>
                    {timeGreeting.suffix}
                  </h1>
                </div>
              </div>
              <p
                className={`mt-3 max-w-2xl text-sm font-bold leading-6 text-accent-soft transition-all duration-700 ease-out sm:text-base ${
                  taglineVisible
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-6 opacity-0"
                }`}
              >
                Share. Study. Succeed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/generate-flashcards"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-accent-hover shadow-lg transition hover:bg-accent-soft active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                Generate Flashcards
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black tracking-tight text-slate-800">
              Your overview
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Upload className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {files.length}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Uploads</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Download className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {totalDownloads}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Downloads</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
              >
                <FlashcardsIcon size={18} />
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {flashcardSetsTotal}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Flashcard Sets
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Flame className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </div>
                {streak.currentStreak > 0 && (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      streak.status === "at_risk"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {streak.status === "at_risk" ? "At risk" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {streak.currentStreak}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Day study streak
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section id="upload-section" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">
              Add a Resource
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a resource to the Study2Gate repository — upload a file, or link to one that's already online.
            </p>

            {uploadMsg.text && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
                  uploadMsg.isError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {uploadMsg.text}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSourceType("UPLOAD")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
                  sourceType === "UPLOAD"
                    ? "bg-white text-accent-hover shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileText className="h-4 w-4" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setSourceType("EXTERNAL_LINK")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
                  sourceType === "EXTERNAL_LINK"
                    ? "bg-white text-accent-hover shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Link2 className="h-4 w-4" /> External Link
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              />

              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Course code e.g. MBC201"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              />

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              >
                <option value="Material">Lecture Material</option>
                <option value="Past Question">Past Question Paper</option>
              </select>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                placeholder="Short description"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              />

              {sourceType === "UPLOAD" ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:p-4">
                  <label
                    htmlFor="material-file"
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-accent-soft hover:bg-accent-soft/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-hover">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : "Choose a file"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {selectedFile
                          ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`
                          : "PDF, DOCX, PPTX or image • Maximum 25 MB"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-accent-soft px-3 py-2 text-xs font-black text-accent-hover">
                      Browse
                    </span>
                  </label>
                  <input
                    id="material-file"
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">
                    Resource URL
                  </label>
                  <div className="relative">
                    <ExternalLink className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://example.edu.ng/resource.pdf"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-accent focus:bg-white"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Point to material that's already hosted elsewhere (e.g. a university's own site) — Study2Gate will link to it instead of storing a copy. Must be a secure (HTTPS) link.
                  </p>
                </div>
              )}

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={copyrightConfirmed}
                  onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                />
                <span className="text-xs leading-5 text-slate-600">
                  {sourceType === "UPLOAD" ? (
                    <>
                      I confirm that I created this material or have the right,
                      permission, or other lawful basis to upload and share it on
                      Study2Gate. I understand that Study2Gate screens uploads for
                      potential copyright issues, and that material flagged by
                      this screen is held for administrator review rather than
                      published immediately, and may be restricted or removed.
                    </>
                  ) : (
                    <>
                      I confirm this link points to legitimate academic material
                      and that I'm not aware of any reason Study2Gate shouldn't
                      point students to it. Study2Gate does not host or take
                      ownership of externally linked resources, and may remove a
                      link if it's found to be inappropriate.
                    </>
                  )}
                </span>
              </label>

              <button
                type="submit"
                disabled={!copyrightConfirmed || isUploading}
                className="w-full rounded-xl bg-accent py-3 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                  />
                )}
                {isUploading
                  ? "Publishing..."
                  : sourceType === "UPLOAD"
                  ? "Publish Document"
                  : "Add Resource Link"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">
                  Study streak 🔥
                </h2>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-900">
                  {streak.currentStreak}
                </span>
                <span className="text-sm font-bold text-amber-700">
                  {streak.currentStreak === 1 ? "day" : "days"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {streak.currentStreak > 0 && streak.status === "at_risk"
                  ? "Study now to keep your streak! 🔥"
                  : streak.currentStreak > 0
                  ? `You're on a roll. Keep studying today to reach ${
                      streak.currentStreak + 1
                    }!`
                  : "Review at least 5 flashcards today to start a streak."}
              </p>
              <div className="mt-5 grid grid-cols-7 gap-1.5">
                {streakDayDots.map((day) => (
                  <div key={day.key} className="text-center">
                    <p className="text-[9px] font-bold text-slate-400">
                      {day.label}
                    </p>
                    <div
                      className={`mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${
                        day.done
                          ? "bg-amber-400 text-white"
                          : day.isToday
                          ? "bg-amber-100 text-amber-600 outline outline-2 outline-amber-300 outline-offset-1"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {day.done ? "✓" : day.isToday ? "•" : ""}
                    </div>
                  </div>
                ))}
              </div>
              {streak.longestStreak > 0 && (
                <p className="mt-4 text-xs font-semibold text-slate-400">
                  Longest streak: {streak.longestStreak}{" "}
                  {streak.longestStreak === 1 ? "day" : "days"}
                </p>
              )}
            </section>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Academic Materials
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and download resources shared in your repository.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search title or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent lg:max-w-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["All", "Material", "Past Question"].map((value) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  filterType === value
                    ? "bg-accent text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {value === "All" ? "All Files" : value}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: "All", label: "All Resources", icon: null },
              { value: "External", label: "External", icon: Link2 },
            ].map(({ value, label, icon: IconCmp }) => (
              <button
                key={value}
                onClick={() => setFilterSource(value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  filterSource === value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {IconCmp && <IconCmp className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>

          <div className="materials-file-strip mt-5 -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
            {filteredFiles.length ? (
              filteredFiles.map((file) => {
                const fileId = file.id ?? file._id;
                const filename =
                  file.filename || file.originalname || file.title;
                const isExternal = file.sourceType === "EXTERNAL_LINK";

                return (
                  <article
                    key={fileId}
                    className="w-[86vw] min-w-[86vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md sm:w-[70vw] sm:min-w-[70vw] md:w-auto md:min-w-0 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-md bg-accent-soft px-2.5 py-1 text-[10px] font-black uppercase text-accent-hover">
                        {file.type || "Material"}
                      </span>
                      {file.courseCode && (
                        <span className="rounded bg-slate-50 px-2 py-1 text-xs font-bold text-slate-400">
                          {file.courseCode}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 break-words font-bold text-slate-900">
                      {file.title || filename}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {file.description || "No description provided."}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5">
                      {isExternal ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft/60 px-2.5 py-1 text-[10px] font-black uppercase text-accent-hover">
                          <Link2 className="h-3 w-3" /> External Resource
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                          <FileText className="h-3 w-3" /> Uploaded Resource
                        </span>
                      )}
                      {isExternal && file.externalDomain && (
                        <span className="text-[11px] text-slate-400">
                          Source: {file.externalDomain}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-400">
                        {isExternal ? "Hosted externally" : `Downloads: ${file.downloads ?? 0}`}
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setReportFile(file)}
                          className="text-[11px] font-bold text-slate-400 hover:text-red-600"
                          title="Report this resource"
                        >
                          Report
                        </button>

                        {isExternal ? (
                          <button
                            type="button"
                            onClick={() => handleOpenExternal(file.externalUrl)}
                            className="inline-flex min-w-[108px] items-center justify-center gap-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-xs font-bold text-accent-hover hover:bg-accent-soft"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Open Resource
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownload(fileId, filename)}
                            disabled={downloadingId === fileId}
                            className={`inline-flex min-w-[108px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                              downloadedId === fileId
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-accent-soft text-accent-hover hover:bg-accent-soft"
                            } disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {downloadingId === fileId ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent-soft border-t-accent-hover" />
                                Downloading...
                              </>
                            ) : downloadedId === fileId ? (
                              <>
                                <Download className="h-3.5 w-3.5" /> Downloaded
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" /> Download
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-400">
                No matching academic materials found.
              </div>
            )}
          </div>
        </section>
      </div>

      {reportFile && (
        <ReportModal
          file={reportFile}
          onClose={() => setReportFile(null)}
          onSubmitted={() => setReportFile(null)}
        />
      )}

      <OutOfCreditsModal open={showOutOfCredits} onClose={() => setShowOutOfCredits(false)} />
    </main>
  );
}
