import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, FileText, Link2, ExternalLink } from "lucide-react";
import api from "../api/api";
import DisputeModal from "../components/DisputeModal";
import OutOfCreditsModal from "../components/OutOfCreditsModal";
import { broadcastDownloadCredits, readDownloadErrorPayload } from "../utils/downloadCredits";

const COPYRIGHT_LABELS = {
  PENDING: { label: "Screening in progress", tone: "bg-slate-100 text-slate-600" },
  REVIEW_REQUIRED: { label: "Under copyright review", tone: "bg-amber-100 text-amber-700" },
  RESTRICTED: { label: "Access restricted", tone: "bg-orange-100 text-orange-700" },
  REMOVED: { label: "Removed", tone: "bg-red-100 text-red-700" },
  REJECTED: { label: "Rejected", tone: "bg-slate-200 text-slate-600" },
};

export default function Materials() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [disputeFile, setDisputeFile] = useState(null);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);

  const userId = Number(localStorage.getItem("userId"));

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.get("/files");
      const all = Array.isArray(response.data) ? response.data : [];
      setFiles(all.filter((file) => Number(file.uploadedBy) === userId));
    } catch (error) {
      console.error("Unable to fetch materials.", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles()
  }, []);

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
      const matchesFilter = filterType === "All" || file.type === filterType;
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

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 flex flex-col gap-4 rounded-3xl bg-accent p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-soft">
              Your library
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              My Materials
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-accent-soft sm:text-base">
              Everything you've uploaded to Study2Gate, in one place.
            </p>
          </div>

          <div className="flex gap-6 sm:gap-8">
            <div>
              <p className="text-2xl font-black">{files.length}</p>
              <p className="text-xs font-bold text-accent-soft">Uploads</p>
            </div>
            <div>
              <p className="text-2xl font-black">{totalDownloads}</p>
              <p className="text-xs font-bold text-accent-soft">Downloads</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Your uploads
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and download the materials you've shared.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search title or course code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent lg:max-w-sm"
              />
              <Link
                to="/upload"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover"
              >
                + Upload
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["All", "Material", "Past Question"].map((value) => (
              <button
                key={value}
                type="button"
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
              { value: "Uploaded", label: "Uploaded", icon: FileText },
              { value: "External", label: "External", icon: Link2 },
            ].map(({ value, label, icon: IconCmp }) => (
              <button
                key={value}
                type="button"
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
            {loading ? (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-400">
                Loading your materials...
              </div>
            ) : filteredFiles.length ? (
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

                    {file.copyrightStatus && file.copyrightStatus !== "CLEARED" && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            COPYRIGHT_LABELS[file.copyrightStatus]?.tone || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {COPYRIGHT_LABELS[file.copyrightStatus]?.label || file.copyrightStatus}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {file.copyrightStatus === "REVIEW_REQUIRED" &&
                            "This upload is undergoing copyright review and isn't publicly visible yet. Similarity alone doesn't mean infringement — an administrator will make the final call."}
                          {file.copyrightStatus === "RESTRICTED" &&
                            (file.restrictionReason || "Access is temporarily restricted while a copyright concern is reviewed.")}
                          {file.copyrightStatus === "REMOVED" &&
                            (file.removalReason || "This material was removed following a copyright review. This is not necessarily a legal finding of infringement.")}
                        </p>
                        {["RESTRICTED", "REMOVED"].includes(file.copyrightStatus) && (
                          <button
                            type="button"
                            onClick={() => setDisputeFile(file)}
                            className="mt-2 text-xs font-bold text-accent-hover hover:underline"
                          >
                            Dispute this decision
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-400">
                        {isExternal ? "Hosted externally" : `Downloads: ${file.downloads ?? 0}`}
                      </span>

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
                            <><Check className="h-3.5 w-3.5" /> Downloaded</>
                          ) : (
                            <><Download className="h-3.5 w-3.5" /> Download</>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <p className="font-bold text-slate-700">
                  {files.length ? "No materials match your search." : "You haven't uploaded anything yet."}
                </p>
                {!files.length && (
                  <Link
                    to="/upload"
                    className="mt-4 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Upload Your First Material
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {disputeFile && (
        <DisputeModal
          file={disputeFile}
          onClose={() => setDisputeFile(null)}
          onSubmitted={() => {
            setDisputeFile(null);
            fetchFiles();
          }}
        />
      )}

      <OutOfCreditsModal open={showOutOfCredits} onClose={() => setShowOutOfCredits(false)} />
    </main>
  );
}
