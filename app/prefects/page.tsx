"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
  registered: boolean;
  created_at: string;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function PrefectsPage() {
  const router = useRouter();
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  // Edit modal state
  const [editing, setEditing] = useState<Prefect | null>(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchPrefects = useCallback(async () => {
    try {
      const res = await fetch("/api/prefects");
      if (res.ok) {
        const data = await res.json();
        setPrefects(data.prefects);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefects();
  }, [fetchPrefects]);

  // While an enrollment was just queued, poll until the device confirms
  // the fingerprint (registered flips to true) or ~3 minutes pass.
  useEffect(() => {
    if (registeringId === null) return;
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > 3 * 60 * 1000) {
        setRegisteringId(null);
        return;
      }
      try {
        const res = await fetch("/api/prefects");
        if (!res.ok) return;
        const data = await res.json();
        const list: Prefect[] = data.prefects || [];
        setPrefects(list);
        const target = list.find((p) => p.id === registeringId);
        if (target?.registered) setRegisteringId(null);
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [registeringId]);

  // -------------------------------------------------------
  // Register on device
  // -------------------------------------------------------

  async function handleRegister(id: number) {
    setRegisteringId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/prefects/${id}/register-device`, { method: "POST" });
      const data = await res.json();
      setFeedback({ id, msg: res.ok ? data.message : data.error, ok: res.ok });
      if (res.ok) {
        // Keep the row polling — the device confirms enrollment asynchronously
        fetchPrefects();
      } else {
        setRegisteringId(null);
      }
    } catch {
      setFeedback({ id, msg: "Network error", ok: false });
      setRegisteringId(null);
    }
  }

  // -------------------------------------------------------
  // Edit
  // -------------------------------------------------------

  function openEdit(prefect: Prefect) {
    setEditing(prefect);
    setEditName(prefect.name);
    setEditClass(prefect.class || "");
    setEditCode(prefect.code || "");
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/prefects/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, class: editClass, code: editCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update prefect");
      setEditing(null);
      setFeedback({ id: editing.id, msg: "Prefect details updated.", ok: true });
      fetchPrefects();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEditSaving(false);
    }
  }

  // -------------------------------------------------------
  // Delete
  // -------------------------------------------------------

  async function handleDelete(id: number) {
    const prefect = prefects.find((p) => p.id === id);
    if (!window.confirm(`Delete ${prefect?.name || "this prefect"}? This also removes their records.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prefects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPrefects((prev) => prev.filter((p) => p.id !== id));
        setFeedback({ id, msg: "Prefect deleted.", ok: true });
      }
    } finally {
      setDeletingId(null);
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  House Prefects
                </h1>
                <p className="text-xs text-slate-500">
                  Register, edit and manage house prefects
                </p>
              </div>
            </div>
            <Link
              href="/prefects/add"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all active:scale-[0.98]"
            >
              + Add Prefect
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feedback toast */}
        {feedback && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && prefects.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 text-slate-300">—</div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              No prefects registered
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Add your first house prefect to get started.
            </p>
            <Link
              href="/prefects/add"
              className="inline-flex px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all"
            >
              + Add House Prefect
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && prefects.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {prefects.length} Prefect{prefects.length !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => { setLoading(true); fetchPrefects(); }}
                className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">PIN</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Device Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prefects.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-sm text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600">
                        {p.class || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600 font-mono">
                        {p.code || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono font-semibold text-slate-700">
                        {p.pin}
                      </td>
                      <td className="px-6 py-3.5">
                        {p.registered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✓ Enrolled
                          </span>
                        ) : registeringId === p.id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            Waiting for fingerprint...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            Not enrolled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            Edit
                          </button>
                          {!p.registered && registeringId !== p.id && (
                            <button
                              onClick={() => handleRegister(p.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              Enroll
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === p.id ? "..." : "×"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !editSaving && setEditing(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Edit Prefect</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                PIN {editing.pin} — if the name changes, the fingerprint device
                is updated too.
              </p>
            </div>
            <form onSubmit={handleSaveEdit} className="px-6 py-4 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  required
                  placeholder="e.g. 10A"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Code <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="e.g. HP001"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !editName.trim() || !editClass.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
