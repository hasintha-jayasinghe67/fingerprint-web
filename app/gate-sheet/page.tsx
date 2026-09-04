"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

const DAYS = [
  { key: 1, label: "Monday" },
  { key: 2, label: "Tuesday" },
  { key: 3, label: "Wednesday" },
  { key: 4, label: "Thursday" },
  { key: 5, label: "Friday" },
];

const ASSIGNMENT_OPTIONS = ["MG", "PG", "PBG"];

interface GateRow {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  registered: boolean;
  days: Record<number, string | null>;
}

export default function GateSheetPage() {
  const router = useRouter();
  const [rows, setRows] = useState<GateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl("/api/gate-sheet"));
      if (!res.ok) throw new Error("Failed to load gate sheet");
      const data = await res.json();
      setRows(data.rows || []);
      setDirty(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load gate sheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setCell = (prefectId: number, day: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.prefectId === prefectId
          ? { ...r, days: { ...r.days, [day]: value || null } }
          : r
      )
    );
    setDirty(true);
    setSavedMsg(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = rows.map((r) => ({
        prefectId: r.prefectId,
        days: r.days,
      }));
      const res = await fetch(apiUrl("/api/gate-sheet"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save gate sheet");
      setDirty(false);
      setLastSaved(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setSavedMsg(
        `Gate sheet saved — ${data.count} assignment${
          data.count === 1 ? "" : "s"
        } stored.`
      );
    } catch (e: any) {
      setError(e.message || "Failed to save gate sheet");
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = rows.reduce(
    (sum, r) =>
      sum + DAYS.filter((d) => r.days[d.key]).length,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Gate Sheet</h1>
                <p className="text-xs text-slate-500">
                  Weekly gate duty roster — Mon to Fri
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/attendance"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                Attendance
              </Link>
              <Link
                href="/prefects"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-all active:scale-95"
              >
                Prefects
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                ⚙ Settings
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  dirty
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving…" : dirty ? "💾 Save changes" : "✓ Saved"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status */}
        {savedMsg && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {savedMsg}
            {lastSaved && (
              <span className="text-green-500 ml-2">({lastSaved})</span>
            )}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600 uppercase tracking-wider">
            Assignments:
          </span>
          <span className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
            MG — Main Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-purple-50 border border-purple-100 text-purple-700">
            PG — Pool Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-teal-50 border border-teal-100 text-teal-700">
            PBG — Palm Beach Gate
          </span>
          <span className="ml-auto">
            {rows.length} prefects · {assignedCount} assignments
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading gate sheet...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-16 text-center">
            <p className="text-slate-600 font-medium">No house prefects yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Add prefects first, then come back to assign gate duties.
            </p>
            <Link
              href="/prefects/add"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all active:scale-95"
            >
              + Add a prefect
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">House Prefect</th>
                  {DAYS.map((d) => (
                    <th key={d.key} className="px-4 py-3 text-center">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.prefectId}
                    className="border-t border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.class || "—"}
                        {r.registered && (
                          <span className="ml-1.5 text-green-600">
                            ✓ enrolled
                          </span>
                        )}
                      </p>
                    </td>
                    {DAYS.map((d) => (
                      <td key={d.key} className="px-3 py-2.5 text-center">
                        <select
                          value={r.days[d.key] || ""}
                          onChange={(e) =>
                            setCell(r.prefectId, d.key, e.target.value)
                          }
                          className={`rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors ${
                            r.days[d.key]
                              ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 focus:border-indigo-400"
                              : "border-slate-200 bg-white text-slate-700 focus:border-indigo-400"
                          }`}
                        >
                          <option value="">—</option>
                          {ASSIGNMENT_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer save */}
        {!loading && rows.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Select an assignment for each day, then save. Saved cells are
              retained and restored next time you open this page.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                dirty
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving…" : dirty ? "💾 Save changes" : "✓ Up to date"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}