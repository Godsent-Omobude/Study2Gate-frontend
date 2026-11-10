import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Users, Upload, ArrowRight, Sparkles, FileText } from "lucide-react";
import api from "../api/api";
import FlashcardList from "../components/FlashcardList";

const isPdfFile = (file) =>
  !!file &&
  (file.type === "application/pdf" ||
    file.name?.toLowerCase().endsWith(".pdf"));

export default function GenerateFlashcards() {
  const [searchParams] = useSearchParams();
  const circleId = searchParams.get("circleId");
  const [circleName, setCircleName] = useState("");

  const [title, setTitle] = useState("");
  const [document, setDocument] = useState(null);
  const [count, setCount] = useState("20");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [flashcards, setFlashcards] = useState([]);

  // Page-range selection (PDF only). totalPages stays null for DOCX files
  // or until the PDF has been analysed.
  const [totalPages, setTotalPages] = useState(null);
  const [pdfInfoLoading, setPdfInfoLoading] = useState(false);
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [rangeError, setRangeError] = useState("");

  const isPdf = isPdfFile(document);

  useEffect(() => {
    if (!circleId) {
      setCircleName("");
      return;
    }

    let cancelled = false;
    api
      .get(`/circles/${circleId}`)
      .then((response) => {
        if (!cancelled) setCircleName(response.data?.name || "");
      })
      .catch(() => {
        if (!cancelled) setCircleName("");
      });

    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const validateRange = (start, end, pages) => {
    const parsedStart = Number(start);
    const parsedEnd = Number(end);

    if (
      start === "" ||
      end === "" ||
      !Number.isInteger(parsedStart) ||
      !Number.isInteger(parsedEnd)
    ) {
      return "Both fields must contain valid page numbers.";
    }
    if (parsedStart < 1) {
      return "Start page cannot be less than 1.";
    }
    if (pages && parsedEnd > pages) {
      return `Invalid page range. This PDF has ${pages} pages. Please select pages 1–${pages}.`;
    }
    if (parsedStart > parsedEnd) {
      return "Start page cannot be greater than end page.";
    }
    return "";
  };

  const handleFileChange = async (file) => {
    setDocument(file);
    setTotalPages(null);
    setStartPage("");
    setEndPage("");
    setRangeError("");
    setError("");

    if (!file || !isPdfFile(file)) {
      return;
    }

    const infoFormData = new FormData();
    infoFormData.append("document", file);

    try {
      setPdfInfoLoading(true);
      const response = await api.post("/ai/pdf-info", infoFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const pages = response.data?.totalPages;
      if (pages) {
        setTotalPages(pages);
        // Default selection covers the whole PDF, so existing behaviour
        // (generate from the entire document) isn't disrupted.
        setStartPage("1");
        setEndPage(String(pages));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to read this PDF's page count. Please try another file."
      );
    } finally {
      setPdfInfoLoading(false);
    }
  };

  const handleStartPageChange = (value) => {
    setStartPage(value);
    setRangeError(validateRange(value, endPage, totalPages));
  };

  const handleEndPageChange = (value) => {
    setEndPage(value);
    setRangeError(validateRange(startPage, value, totalPages));
  };

  const generateFlashcards = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setFlashcards([]);

    if (!document) {
      setError("Please choose a PDF or DOCX document.");
      return;
    }

    if (isPdf) {
      const validationMessage = validateRange(startPage, endPage, totalPages);
      if (validationMessage) {
        setRangeError(validationMessage);
        return;
      }
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("document", document);
    formData.append("count", count);
    formData.append("difficulty", difficulty);

    if (isPdf && startPage && endPage) {
      formData.append("startPage", startPage);
      formData.append("endPage", endPage);
    }

    if (circleId) {
      formData.append("circleId", circleId);
    }

    try {
      setLoading(true);

      const response = await api.post("/ai/flashcards", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const generated =
        response.data?.flashcardSet?.flashcards ||
        response.data?.flashcards ||
        [];

      setFlashcards(generated);
      setMessage(
        response.data?.message ||
          "Flashcards generated and saved successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to generate flashcards. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-bold text-accent">AI STUDY TOOL</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">
            AI Flashcards
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload your study material and let AI turn it into revision cards.
          </p>
          {circleId && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent-soft bg-accent-soft px-3 py-2 text-xs font-bold text-accent-hover">
              <Users className="h-3.5 w-3.5" /> Generating for {circleName || "your Study Circle"} — this set
              will be shared with the whole circle.
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Generate Flashcards
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the number and difficulty before generating.
              </p>
            </div>

            <form onSubmit={generateFlashcards} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  1. Upload Document
                </label>
                <label className="mt-2 flex min-h-44 min-w-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-accent-soft bg-accent-soft/40 px-5 text-center transition hover:bg-accent-soft">
                  <Upload className="h-10 w-10 text-accent" strokeWidth={1.75} />
                  <span className="mt-2 max-w-full break-all font-bold text-slate-800">
                    {document ? document.name : "Click to browse for a document"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    PDF or DOCX
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) =>
                      handleFileChange(e.target.files?.[0] || null)
                    }
                  />
                </label>
                {isPdf && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {pdfInfoLoading
                      ? "Analysing PDF..."
                      : totalPages
                      ? `This PDF has ${totalPages} pages.`
                      : null}
                  </p>
                )}
              </div>

              {isPdf && (
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Flashcard pages
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="from-page"
                        className="text-xs font-semibold text-slate-500"
                      >
                        From page
                      </label>
                      <input
                        id="from-page"
                        type="number"
                        min={1}
                        max={totalPages || undefined}
                        disabled={pdfInfoLoading || !totalPages}
                        value={startPage}
                        onChange={(e) => handleStartPageChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="to-page"
                        className="text-xs font-semibold text-slate-500"
                      >
                        To page
                      </label>
                      <input
                        id="to-page"
                        type="number"
                        min={1}
                        max={totalPages || undefined}
                        disabled={pdfInfoLoading || !totalPages}
                        value={endPage}
                        onChange={(e) => handleEndPageChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                  {rangeError && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {rangeError}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-slate-700">
                  2. Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Biochemistry Week 1"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    3. Number of Flashcards
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                  >
                    {[5, 10, 20, 30, 50, 75, 100].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    4. Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  {message}
                  {circleId && (
                    <>
                      {" "}
                      <Link to={`/circles/${circleId}?tab=flashcards`} className="inline-flex items-center gap-1 underline">
                        View in circle <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  pdfInfoLoading ||
                  (isPdf && (!totalPages || !!rangeError))
                }
                className="w-full rounded-xl bg-accent px-5 py-3.5 text-sm font-black text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Generating..."
                  : pdfInfoLoading
                  ? "Analysing PDF..."
                  : (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Generate Flashcards
                    </span>
                  )}
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl bg-accent-soft p-5">
                <FileText className="h-7 w-7 text-accent-hover" />
                <h3 className="mt-3 font-black text-slate-900">
                  Upload
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Upload your PDF or DOCX study material.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-5">
                <Sparkles className="h-7 w-7 text-emerald-700" />
                <h3 className="mt-3 font-black text-slate-900">
                  Generate
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Generate Flashcard and Test Yourself Before Revealing Answers.
                </p>
              </div>

              <div className="rounded-2xl bg-accent-soft p-5">
                <FileText className="h-7 w-7 text-accent-hover" />
                <h3 className="mt-3 font-black text-slate-900">
                  Study & Learn
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your generated set is saved and can be studied later.
                </p>
              </div>
            </div>
          </section>
        </div>

        <FlashcardList flashcards={flashcards} />
      </div>
    </main>
  );
}
