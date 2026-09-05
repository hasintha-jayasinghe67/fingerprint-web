"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import {
  IconSettings,
  IconSave,
  IconCheck,
} from "@/components/icons";

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

  const navLinkClass =
    "px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors";

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Gate Sheet"
        subtitle="Weekly gate duty roster — Mon to Fri"
        backTo="/"
        actions={
          <>
            <Link href="/attendance" className={navLinkClass}>
              Attendance
            </Link>
            <Link href="/prefects" className={navLinkClass}>
              Prefects
            </Link>
            <Link href="/settings" className={navLinkClass}>
              <IconSettings className="w-3 h-3 mr-1" />
              Settings
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dirty
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {saving ? (
                "Saving…"
              ) : dirty ? (
                <>
                  <IconSave className="w-3 h-3 mr-1" />
                  Save changes
                </>
              ) : (
                <>
                  <IconCheck className="w-3 h-3 mr-1" />
                  Saved
                </>
              )}
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status */}
        {savedMsg && (
          <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {savedMsg}
            {lastSaved && (
              <span className="text-emerald-500 ml-2">({lastSaved})</span>
            )}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Assignments:</span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            MG — Main Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            PG — Pool Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
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
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading gate sheet...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-600 font-medium">No house prefects yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Add prefects first, then come back to assign gate duties.
            </p>
            <Link
              href="/prefects/add"
              className="inline-block mt-4 px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              + Add a prefect
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            {/* border-separate + min-width so the roster scrolls horizontally
                on phones while the prefect name stays pinned on the left. */}
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 sticky left-0 z-10 bg-slate-50 border-b border-slate-200 border-r border-slate-200">
                    House Prefect
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.key} className="px-4 py-3 text-center border-b border-slate-200">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.prefectId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 sticky left-0 z-[1] bg-white border-b border-slate-100 border-r border-slate-200">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.class || "—"}
                        {r.registered && (
                          <span className="ml-1.5 text-emerald-600">
                            enrolled
                          </span>
                        )}
                      </p>
                    </td>
                    {DAYS.map((d) => (
                      <td key={d.key} className="px-3 py-2.5 text-center border-b border-slate-100">
                        <select
                          value={r.days[d.key] || ""}
                          onChange={(e) =>
                            setCell(r.prefectId, d.key, e.target.value)
                          }
                          className={`rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors ${
                            r.days[d.key]
                              ? "border-brand-300 bg-brand-50 font-medium text-brand-800 focus:border-brand-400"
                              : "border-slate-200 bg-white text-slate-700 focus:border-brand-400"
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
              className={`px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                dirty
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {saving ? (
                "Saving…"
              ) : dirty ? (
                <>
                  <IconSave className="w-3.5 h-3.5 mr-1" />
                  Save changes
                </>
              ) : (
                <>
                  <IconCheck className="w-3.5 h-3.5 mr-1" />
                  Up to date
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
