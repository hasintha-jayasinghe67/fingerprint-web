"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface SlotEntry {
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  time: string;
  late: boolean;
}

interface GateEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  status: string | null;
  // Server-computed: "Late" for prefects who signed in late for the
  // morning session; used as the pre-filled mark on unsaved days.
  defaultStatus: string | null;
}

interface DayData {
  date: string;
  morningSigninTime: string;
  gateSaved: boolean;
  gateEntries: GateEntry[];
  slots: {
    morning: SlotEntry[];
    second: SlotEntry[];
    third: SlotEntry[];
  };
}

type Tab = "morning" | "gate";

const GATE_STATUSES = ["Present", "Absent", "Late", "EG", "ES", "Traitor"];

const GATE_STATUS_STYLES: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Absent: "bg-red-100 text-red-700 border-red-200",
  Late: "bg-amber-100 text-amber-700 border-amber-200",
  EG: "bg-blue-100 text-blue-700 border-blue-200",
  ES: "bg-purple-100 text-purple-700 border-purple-200",
  Traitor: "bg-rose-100 text-rose-700 border-rose-200",
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toDisplayTime(time: string): string {
  const [h, m, s] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period}`;
}

function toTimeNoSeconds(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function avatarChar(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AttendanceDateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const date = params?.date as string;

  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("morning");

  // Gate attendance draft (unsaved days)
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/attendance/date/${date}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      const json = await res.json();
      setData(json);
      setDrafts({});
      setSaveNotice(null);
      setSaveError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------
  // Gate attendance save
  // -------------------------------------------------------

  async function handleSaveGate() {
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);

    try {
      const entries = data.gateEntries.map((entry) => ({
        prefectId: entry.prefectId,
        status:
          drafts[entry.prefectId] ??
          entry.status ??
          entry.defaultStatus ??
          "Present",
      }));

      const res = await fetch(`/api/gate-attendance/${data.date}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Already saved on another device/session → reload view-only state
        if (res.status === 409) {
          await fetchData();
        }
        throw new Error(json.error || "Failed to save gate attendance");
      }

      setSaveNotice(
        `Gate attendance saved for ${formatDateDisplay(data.date)}. This date is now view-only.`
      );
      await fetchData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function gateValue(entry: GateEntry): string {
    if (data?.gateSaved) return entry.status || "";
    return (
      drafts[entry.prefectId] ?? entry.status ?? entry.defaultStatus ?? "Present"
    );
  }

  // -------------------------------------------------------
  // Derived
  // -------------------------------------------------------

  const morning = data?.slots.morning || [];
  const second = data?.slots.second || [];
  const third = data?.slots.third || [];
  const lateCount = morning.filter((m) => m.late).length;
  const gateSaved = !!data?.gateSaved;

  const gateCounts: Record<string, number> = {};
  for (const entry of data?.gateEntries || []) {
    const status = gateSaved ? entry.status : gateValue(entry);
    if (status) gateCounts[status] = (gateCounts[status] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/attendance")}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Attendance Details
                </h1>
                <p className="text-xs text-slate-500">
                  {date ? formatDateDisplay(date) : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/attendance"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                All Dates
              </Link>
              <Link
                href="/gate-sheet"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                Gate Sheet
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
              >
                ⚙ Morning time
              </Link>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchData();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading records...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("morning")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  activeTab === "morning"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Morning Check-in
              </button>
              <button
                onClick={() => setActiveTab("gate")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  activeTab === "gate"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Gate Attendance
                {gateSaved && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white align-middle">
                    Saved
                  </span>
                )}
              </button>
            </div>

            {/* ================= Morning Check-in tab ================= */}
            {activeTab === "morning" && (
              <div>
                {/* Slot summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Morning sign-ins
                    </p>
                    <p className="text-2xl font-bold text-slate-800">{morning.length}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Expected by{" "}
                      {data.morningSigninTime
                        ? toTimeNoSeconds(`${data.morningSigninTime}:00`)
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Latecomers
                    </p>
                    <p className={`text-2xl font-bold ${lateCount > 0 ? "text-red-600" : "text-slate-800"}`}>
                      {lateCount}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      11:15 sign-in
                    </p>
                    <p className="text-2xl font-bold text-slate-800">{second.length}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      1:30 sign-in
                    </p>
                    <p className="text-2xl font-bold text-slate-800">{third.length}</p>
                  </div>
                </div>

                {/* Morning sign-in table */}
                {morning.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                    <div className="text-5xl text-slate-300 mb-4">—</div>
                    <h3 className="text-lg font-semibold text-slate-700">
                      No morning sign-ins on this date
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      House prefects who scanned their fingerprint before 11:00
                      AM appear here.
                    </p>
                  </div>
                ) : (
                  <SignInTable
                    title={`Morning Check-in Times (${morning.length})`}
                    subtitle={`Target ${toTimeNoSeconds(`${data.morningSigninTime}:00`)} — scans after this are late`}
                    entries={morning}
                  />
                )}

                {/* Other two daily sign-in slots */}
                <div className="mt-6 space-y-6">
                  {second.length > 0 && (
                    <SignInTable
                      title={`11:15 Sign-in (${second.length})`}
                      subtitle="Scans from 11:00 AM onwards"
                      entries={second}
                      showStatus={false}
                    />
                  )}
                  {third.length > 0 && (
                    <SignInTable
                      title={`1:30 Sign-in (${third.length})`}
                      subtitle="Scans from 1:20 PM onwards"
                      entries={third}
                      showStatus={false}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ================= Gate Attendance tab ================= */}
            {activeTab === "gate" && (
              <div>
                {/* Banner */}
                {gateSaved ? (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                    <strong>✓ Saved</strong> — Gate attendance for this date has
                    been saved and is now <strong>view-only</strong>.
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                    Mark each prefect&apos;s gate attendance below, then press{" "}
                    <strong>Save Attendance</strong>. Once saved, this date
                    becomes view-only.
                  </div>
                )}

                {saveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {saveError}
                  </div>
                )}
                {saveNotice && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                    {saveNotice}
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Table header with save button */}
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Gate Attendance ({data.gateEntries.length} prefects)
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {GATE_STATUSES.map((status) => (
                          <span key={status} className="text-xs text-slate-500">
                            {status}:{" "}
                            <strong className="text-slate-700">
                              {gateCounts[status] || 0}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    {!gateSaved && (
                      <button
                        onClick={handleSaveGate}
                        disabled={saving || data.gateEntries.length === 0}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          "Save Attendance"
                        )}
                      </button>
                    )}
                  </div>

                  {data.gateEntries.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">
                      No prefects registered yet. Add house prefects first.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prefect</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {gateSaved ? "Status" : "Mark status"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.gateEntries.map((entry, idx) => {
                            const value = gateValue(entry);
                            return (
                              <tr key={entry.prefectId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 text-sm text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {avatarChar(entry.name)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        {entry.name}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {entry.class && (
                                          <span className="mr-2 font-medium text-slate-500">{entry.class}</span>
                                        )}
                                        <span className="font-mono">PIN: {entry.pin}</span>
                                        {entry.code && (
                                          <span className="ml-2 font-mono">Code: {entry.code}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  {gateSaved ? (
                                    value ? (
                                      <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${GATE_STATUS_STYLES[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                                      >
                                        {value}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-slate-300">—</span>
                                    )
                                  ) : (
                                    <select
                                      value={value || "Present"}
                                      onChange={(e) =>
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [entry.prefectId]: e.target.value,
                                        }))
                                      }
                                      className={`px-3 py-2 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${GATE_STATUS_STYLES[value] || "bg-white border-slate-300 text-slate-700"}`}
                                    >
                                      {GATE_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                          {status}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// -------------------------------------------------------
// Sign-in table (shared by the three daily slots)
// -------------------------------------------------------

function SignInTable({
  title,
  subtitle,
  entries,
  showStatus = true,
}: {
  title: string;
  subtitle?: string;
  entries: SlotEntry[];
  showStatus?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <span className="text-xs text-slate-400">{subtitle}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prefect</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sign-in time</th>
              {showStatus && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, idx) => (
              <tr
                key={`${entry.pin}-${idx}`}
                className={`transition-colors ${entry.late ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/50"}`}
              >
                <td className="px-6 py-3.5 text-sm text-slate-400 font-mono">{idx + 1}</td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {avatarChar(entry.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{entry.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {entry.class && (
                          <span className="font-medium text-slate-500">{entry.class}</span>
                        )}
                        <span className="font-mono">PIN: {entry.pin}</span>
                        {entry.code && (
                          <span className="font-mono">Code: {entry.code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="text-sm font-mono font-semibold text-slate-700">
                    {toDisplayTime(entry.time)}
                  </span>
                </td>
                {showStatus && (
                  <td className="px-6 py-3.5">
                    {entry.late ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white border border-red-700">
                        ⚠ LATE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        ✓ On time
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}