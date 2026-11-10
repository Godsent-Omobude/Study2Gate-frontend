import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { FlashcardsIcon } from "../components/icons/AdminIcons";
import api from "../api/api";
import FlashcardList from "../components/FlashcardList";
import FlashcardSetCard from "../components/FlashcardSetCard";

export default function MyFlashcards() {
  const { id } = useParams();
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/ai/flashcards");
      setSets(response.data?.flashcardSets || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your saved flashcards."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSet = async (setId) => {
    try {
      setError("");
      const response = await api.get(`/ai/flashcards/${setId}`);
      setSelectedSet(response.data?.flashcardSet || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to open this flashcard set."
      );
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  useEffect(() => {
    if (id) {
      loadSet(id);
    } else {
      setSelectedSet(null);
    }
  }, [id]);

  const deleteSet = async (setId) => {
    const confirmed = window.confirm(
      "Delete this flashcard set? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/ai/flashcards/${setId}`);
      setSets((current) => current.filter((set) => set.id !== setId));

      if (selectedSet?.id === setId) {
        setSelectedSet(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete this flashcard set."
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse rounded-3xl bg-white p-10 shadow-sm">
            Loading your flashcards...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-accent">LIBRARY</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              My Flashcards
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your saved AI-generated flashcard sets.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {sets.length > 0 && (
              <Link
                to="/my-flashcards/study-all"
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent-soft bg-white px-4 py-3 text-sm font-bold text-accent-hover shadow-sm hover:bg-accent-soft"
              >
                <RotateCcw className="h-4 w-4" /> Study All (Spaced Repetition)
              </Link>
            )}
            <Link
              to="/generate-flashcards"
              className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover"
            >
              + Generate New Set
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {selectedSet ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to="/my-flashcards"
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to My Flashcards
                </Link>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {selectedSet.title || "Untitled Flashcards"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSet.flashcards?.length || 0} flashcards
                  {selectedSet.isOwner === false && selectedSet.createdByUsername
                    ? ` · Shared by ${selectedSet.createdByUsername}`
                    : ""}
                </p>
                {selectedSet.lastPracticeScore !== null &&
                  selectedSet.lastPracticeScore !== undefined && (
                    <p className="mt-1 text-xs font-bold text-emerald-600">
                      Last practice score: {selectedSet.lastPracticeScore}%
                    </p>
                  )}
              </div>

              {selectedSet.isOwner !== false && (
                <button
                  onClick={() => deleteSet(selectedSet.id)}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  Delete Set
                </button>
              )}
            </div>

            <FlashcardList
              flashcards={selectedSet.flashcards || []}
              title="Study Session"
              flashcardSetId={selectedSet.id}
            />
          </section>
        ) : (
          <>
            {sets.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
                >
                  <FlashcardsIcon size={32} />
                </div>
                <h2 className="mt-5 text-xl font-black text-slate-900">
                  No saved flashcards yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Generate your first set from a PDF or DOCX study material.
                </p>
                <Link
                  to="/generate-flashcards"
                  className="mt-5 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover"
                >
                  Generate Flashcards
                </Link>
              </section>
            ) : (
              <div className="flashcard-sets-scroll -mx-1 px-1 pb-2">
                <div className="grid w-max min-w-full gap-4 md:grid-cols-2">
                  {sets.map((set) => (
                    <FlashcardSetCard
                      key={set.id}
                      set={set}
                      onDelete={deleteSet}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
