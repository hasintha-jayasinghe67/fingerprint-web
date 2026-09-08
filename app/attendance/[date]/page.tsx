"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useAuth, isAdminOrAbove, isSuperuser } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import HeaderMenu, { headerMenuItemClass } from "@/components/HeaderMenu";
import Modal from "@/components/Modal";
import {
  IconSettings,
  IconRefresh,
  IconCheck,
  IconWarning,
} from "@/components/icons";

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
  // Server-computed: "Late" for morning latecomers; "To be marked" otherwise.
  defaultStatus: string | null;
  // Gate-sheet duty for this date's weekday (MG / PG / PBG), if any.
  gateAssignment: "MG" | "PG" | "PBG" | null;
  // True when the prefect has at least one fingerprint scan that day.
  signedIn: boolean;
}

interface DayData {
  date: string;
  morningSigninTime: string;
  gateSaved: boolean;
  dayOfWeek: number;
  gateEntries: GateEntry[];
  slots: {
    morning: SlotEntry[];
    second: SlotEntry[];
    third: SlotEntry[];
  };
}

type Tab = "morning" | "gate";
type GateDutyTab = "MG" | "PG" | "PBG" | "all";

const GATE_DUTY_TABS: { id: GateDutyTab; label: string }[] = [
  { id: "MG", label: "Main Gate" },
  { id: "PG", label: "Pool Gate" },
  { id: "PBG", label: "Palm Beach Gate" },
  { id: "all", label: "All" },
];

const GATE_STATUSES = [
  "To be marked",
  "Present",
  "Absent",
  "Late",
  "EG",
  "ES",
  "Traitor",
];

const MARKED_STATUSES = new Set([
  "Present",
  "Absent",
  "Late",
  "EG",
  "ES",
]);

const GATE_STATUS_STYLES: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-red-50 text-red-700 border-red-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  EG: "bg-sky-50 text-sky-700 border-sky-200",
  ES: "bg-slate-100 text-slate-700 border-slate-200",
  Traitor: "bg-rose-50 text-rose-700 border-rose-200",
  "To be marked": "bg-slate-50 text-slate-500 border-slate-200",
};

const EXCUSE_TEXTAREA_ROWS = 8;

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

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseExcuseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function prefectMatchesLine(entry: GateEntry, line: string): boolean {
  const key = normalizeMatchKey(line);
  if (!key) return false;
  if (normalizeMatchKey(entry.name) === key) return true;
  if (entry.code && normalizeMatchKey(entry.code) === key) return true;
  return false;
}

function isUnmarked(status: string | null | undefined): boolean {
  return !status || status === "To be marked";
}

/**
 * Apply ES / EG lists to current statuses, then mark remaining unmarked
 * prefects as Traitor.
 *
 * Rules:
 * - Present is never overwritten
 * - Late may be overwritten by EG only
 * - ES / EG only fill unmarked statuses (except Late → EG above)
 * - Anyone still not Present / Late / Absent / ES / EG becomes Traitor
 */
function applyExcuses(
  entries: GateEntry[],
  currentStatuses: Record<number, string>,
  esText: string,
  egText: string
): Record<number, string> {
  const next: Record<number, string> = { ...currentStatuses };
  const esLines = parseExcuseLines(esText);
  const egLines = parseExcuseLines(egText);

  for (const entry of entries) {
    const current = next[entry.prefectId] ?? entry.status ?? "";
    if (current === "Present") continue;
    const inEs = esLines.some((line) => prefectMatchesLine(entry, line));
    if (inEs && isUnmarked(current)) {
      next[entry.prefectId] = "ES";
    }
  }

  for (const entry of entries) {
    const current = next[entry.prefectId] ?? entry.status ?? "";
    if (current === "Present") continue;
    const inEg = egLines.some((line) => prefectMatchesLine(entry, line));
    if (!inEg) continue;
    if (current === "Late" || isUnmarked(current)) {
      next[entry.prefectId] = "EG";
    }
  }

  for (const entry of entries) {
    const current = next[entry.prefectId] ?? entry.status ?? "";
    if (!MARKED_STATUSES.has(current)) {
      next[entry.prefectId] = "Traitor";
    }
  }

  return next;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AttendanceDateDetailPage() {
  const params = useParams();
  const date = params?.date as string;
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);
  const canEditAfterSave = isSuperuser(user);

  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("morning");
  const [gateDutyTab, setGateDutyTab] = useState<GateDutyTab>("MG");

  // Gate attendance draft
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Excuses modal
  const [excusesOpen, setExcusesOpen] = useState(false);
  const [esList, setEsList] = useState("");
  const [egList, setEgList] = useState("");
  const [excusing, setExcusing] = useState(false);
  const [excuseError, setExcuseError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiUrl(`/api/attendance/date/${date}`));
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

  // Editable when unsaved, or when superuser after save
  const canEditStatuses =
    !!data && (!data.gateSaved || canEditAfterSave) && canWrite;

  // -------------------------------------------------------
  // Gate attendance save
  // -------------------------------------------------------

  async function persistGateEntries(
    entries: { prefectId: number; status: string }[],
    options: { force?: boolean; successMessage: string }
  ) {
    if (!data) return false;
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);

    try {
      const res = await fetch(apiUrl(`/api/gate-attendance/${data.date}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          force: options.force === true,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          await fetchData();
        }
        throw new Error(json.error || "Failed to save gate attendance");
      }

      setSaveNotice(options.successMessage);
      await fetchData();
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGate() {
    if (!data || !canEditStatuses) return;

    const entries = data.gateEntries.map((entry) => ({
      prefectId: entry.prefectId,
      status:
        drafts[entry.prefectId] ??
        entry.status ??
        entry.defaultStatus ??
        "To be marked",
    }));

    await persistGateEntries(entries, {
      force: data.gateSaved && canEditAfterSave,
      successMessage: data.gateSaved
        ? `Gate attendance updated for ${formatDateDisplay(data.date)}.`
        : `Gate attendance saved for ${formatDateDisplay(data.date)}. You can now add ES/EG excuses.`,
    });
  }

  async function handleExcuse() {
    if (!data || !canWrite || !data.gateSaved) return;

    setExcusing(true);
    setExcuseError(null);

    try {
      const currentStatuses: Record<number, string> = {};
      for (const entry of data.gateEntries) {
        currentStatuses[entry.prefectId] =
          drafts[entry.prefectId] ??
          entry.status ??
          entry.defaultStatus ??
          "To be marked";
      }

      const nextStatuses = applyExcuses(
        data.gateEntries,
        currentStatuses,
        esList,
        egList
      );

      const entries = data.gateEntries.map((entry) => ({
        prefectId: entry.prefectId,
        status: nextStatuses[entry.prefectId] ?? "Traitor",
      }));

      // Persist directly so modal errors stay in the dialog
      setSaving(true);
      setSaveError(null);
      const res = await fetch(apiUrl(`/api/gate-attendance/${data.date}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, force: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to apply excuses");
      }

      setSaveNotice(
        `Excuses applied for ${formatDateDisplay(data.date)}. Unmarked prefects were set to Traitor.`
      );
      setExcusesOpen(false);
      setEsList("");
      setEgList("");
      await fetchData();
    } catch (err) {
      setExcuseError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExcusing(false);
      setSaving(false);
    }
  }

  function gateValue(entry: GateEntry): string {
    return (
      drafts[entry.prefectId] ??
      entry.status ??
      entry.defaultStatus ??
      "To be marked"
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
  const showExcuseButton = gateSaved && canWrite;
  const showStatusSelects = canEditStatuses;

  const gateCounts: Record<string, number> = {};
  for (const entry of data?.gateEntries || []) {
    const status = gateValue(entry);
    if (status) gateCounts[status] = (gateCounts[status] || 0) + 1;
  }

  const visibleGateEntries = (data?.gateEntries || []).filter((entry) => {
    if (gateDutyTab === "all") return true;
    return entry.gateAssignment === gateDutyTab && entry.signedIn;
  });

  const gateDutyEmptyMessage =
    gateDutyTab === "all"
      ? "No prefects registered yet. Add house prefects first."
      : `No signed-in prefects are assigned to ${
          GATE_DUTY_TABS.find((t) => t.id === gateDutyTab)?.label || "this gate"
        } for this day.`;

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Attendance Details"
        subtitle={date ? formatDateDisplay(date) : ""}
        backTo="/attendance"
        maxWidth="5xl"
        actions={
          <>
            <HeaderMenu label="Navigate">
              <Link href="/attendance" role="menuitem" className={headerMenuItemClass}>
                All Dates
              </Link>
              <Link href="/gate-sheet" role="menuitem" className={headerMenuItemClass}>
                Gate Sheet
              </Link>
              <Link href="/settings" role="menuitem" className={headerMenuItemClass}>
                <IconSettings className="w-3 h-3" />
                Morning time
              </Link>
            </HeaderMenu>
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
            >
              <IconRefresh className="w-3 h-3 mr-1" />
              Refresh
            </button>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading records...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("morning")}
                className={`flex-1 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === "morning"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Morning Check-in
              </button>
              <button
                onClick={() => setActiveTab("gate")}
                className={`flex-1 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === "gate"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Gate Attendance
                {gateSaved && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white align-middle">
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
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      Morning sign-ins
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{morning.length}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Expected by{" "}
                      {data.morningSigninTime
                        ? toTimeNoSeconds(`${data.morningSigninTime}:00`)
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      Latecomers
                    </p>
                    <p className={`text-2xl font-semibold ${lateCount > 0 ? "text-red-600" : "text-slate-900"}`}>
                      {lateCount}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      11:15 sign-in
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{second.length}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      1:30 sign-in
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{third.length}</p>
                  </div>
                </div>

                {/* Morning sign-in table */}
                {morning.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
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
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                    <strong>Saved</strong> — Gate attendance for this date has
                    been saved.
                    {canEditAfterSave
                      ? " As a superuser you can still change statuses."
                      : canWrite
                        ? " Use Add excuses to apply ES/EG lists."
                        : " This date is view-only."}
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg text-brand-800 text-sm">
                    {canWrite ? (
                      <>
                        Mark each prefect&apos;s gate attendance below, then press{" "}
                        <strong>Save Attendance</strong>. Non-latecomers default
                        to <strong>To be marked</strong>. After saving you can
                        add ES/EG excuses.
                      </>
                    ) : (
                      <>You have view-only access to gate attendance.</>
                    )}
                  </div>
                )}

                {saveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    {saveError}
                  </div>
                )}
                {saveNotice && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
                    {saveNotice}
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Table header with actions */}
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
                    <div className="flex flex-wrap items-center gap-2">
                      {showExcuseButton && (
                        <button
                          type="button"
                          onClick={() => {
                            setExcuseError(null);
                            setExcusesOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-md bg-white text-slate-800 text-sm font-semibold border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          Add excuses
                        </button>
                      )}
                      {showStatusSelects && (
                        <button
                          onClick={handleSaveGate}
                          disabled={saving || data.gateEntries.length === 0}
                          className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </span>
                          ) : gateSaved ? (
                            "Update Attendance"
                          ) : (
                            "Save Attendance"
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Gate duty sub-tabs */}
                  <div className="px-4 sm:px-6 pt-3 pb-0 border-b border-slate-100">
                    <div className="flex gap-1 overflow-x-auto">
                      {GATE_DUTY_TABS.map((tab) => {
                        const count =
                          tab.id === "all"
                            ? data.gateEntries.length
                            : data.gateEntries.filter(
                                (e) =>
                                  e.gateAssignment === tab.id && e.signedIn
                              ).length;
                        const active = gateDutyTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setGateDutyTab(tab.id)}
                            className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                              active
                                ? "border-brand-600 text-brand-700 bg-brand-50/60"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {tab.label}
                            <span
                              className={`ml-1.5 text-[11px] ${
                                active ? "text-brand-600" : "text-slate-400"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {gateDutyTab !== "all" && (
                      <p className="text-xs text-slate-400 pb-3 pt-1">
                        Prefects assigned to this gate today who have already
                        signed in. Status changes sync to the All tab.
                      </p>
                    )}
                    {gateDutyTab === "all" && (
                      <p className="text-xs text-slate-400 pb-3 pt-1">
                        All house prefects. Statuses stay in sync with the gate
                        tabs.
                      </p>
                    )}
                  </div>

                  {visibleGateEntries.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">
                      {data.gateEntries.length === 0
                        ? "No prefects registered yet. Add house prefects first."
                        : gateDutyEmptyMessage}
                    </div>
                  ) : (
                    <GatePrefectTable
                      entries={visibleGateEntries}
                      gateValue={gateValue}
                      showStatusSelects={showStatusSelects}
                      onStatusChange={(prefectId, status) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [prefectId]: status,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        isOpen={excusesOpen}
        onClose={() => {
          if (excusing) return;
          setExcusesOpen(false);
        }}
        title="Add excuses"
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Enter one prefect code or name per line. Present is never changed.
            Late may be overwritten by EG. Remaining unmarked prefects become
            Traitor.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-es" className="text-sm font-medium text-slate-700">
              ES
            </label>
            <textarea
              id="excuse-es"
              rows={EXCUSE_TEXTAREA_ROWS}
              value={esList}
              onChange={(e) => setEsList(e.target.value)}
              placeholder={"One code or name per line"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none overflow-y-auto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-eg" className="text-sm font-medium text-slate-700">
              EG
            </label>
            <textarea
              id="excuse-eg"
              rows={EXCUSE_TEXTAREA_ROWS}
              value={egList}
              onChange={(e) => setEgList(e.target.value)}
              placeholder={"One code or name per line"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none overflow-y-auto"
            />
          </div>

          {excuseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {excuseError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setExcusesOpen(false)}
              disabled={excusing}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExcuse}
              disabled={excusing || saving}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {excusing || saving ? "Applying..." : "Excuse"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// -------------------------------------------------------
// Gate prefect status table (shared across gate duty tabs)
// -------------------------------------------------------

function GatePrefectTable({
  entries,
  gateValue,
  showStatusSelects,
  onStatusChange,
}: {
  entries: GateEntry[];
  gateValue: (entry: GateEntry) => string;
  showStatusSelects: boolean;
  onStatusChange: (prefectId: number, status: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">#</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Prefect</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
              {showStatusSelects ? "Mark status" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry, idx) => {
            const value = gateValue(entry);
            return (
              <tr key={entry.prefectId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3 text-sm text-slate-400 font-mono hidden sm:table-cell">{idx + 1}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                      {avatarChar(entry.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
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
                        {entry.gateAssignment && (
                          <span className="ml-2">{entry.gateAssignment}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  {showStatusSelects ? (
                    <select
                      value={value || "To be marked"}
                      onChange={(e) =>
                        onStatusChange(entry.prefectId, e.target.value)
                      }
                      className={`px-3 py-2 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors ${GATE_STATUS_STYLES[value] || "bg-white border-slate-300 text-slate-700"}`}
                    >
                      {GATE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : value ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${GATE_STATUS_STYLES[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      {value}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Prefect</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Sign-in time</th>
              {showStatus && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, idx) => (
              <tr
                key={`${entry.pin}-${idx}`}
                className={`transition-colors ${entry.late ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/50"}`}
              >
                <td className="px-6 py-3.5 text-sm text-slate-400 font-mono hidden sm:table-cell">{idx + 1}</td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                      {avatarChar(entry.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{entry.name}</p>
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
                  <span className="text-sm font-mono font-medium text-slate-700">
                    {toDisplayTime(entry.time)}
                  </span>
                </td>
                {showStatus && (
                  <td className="px-6 py-3.5">
                    {entry.late ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white border border-red-700">
                        <IconWarning className="w-3 h-3" />
                        LATE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <IconCheck className="w-3 h-3" />
                        On time
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
