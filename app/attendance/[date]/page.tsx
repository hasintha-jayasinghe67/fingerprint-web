"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { GATE_STATUSES, GATE_STATUS_STYLES } from "@/lib/gateStatuses";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface SlotEntry {
  prefectId?: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  time: string;
  late: boolean;
}

interface SlotAttendanceEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  time: string | null;
  status: string | null;
  defaultStatus: "Present" | "Absent";
}

interface SlotAttendanceBlock {
  saved: boolean;
  entries: SlotAttendanceEntry[];
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

interface DayBatch {
  id: number;
  name: string;
  morningSigninTime: string;
  extended: boolean;
}

interface DayData {
  date: string;
  batches: DayBatch[];
  gateSaved: boolean;
  dayOfWeek: number;
  gateEntries: GateEntry[];
  slots: {
    morning: SlotEntry[];
    second: SlotEntry[];
    third: SlotEntry[];
  };
  slotAttendance: {
    second: SlotAttendanceBlock;
    third: SlotAttendanceBlock;
  };
}

type Tab = "morning" | "second" | "third" | "gate";
type GateDutyTab = "MG" | "PG" | "PBG" | "all" | "traitors";
type AttendanceSlot = "second" | "third";

const SLOT_STATUSES = ["Present", "Absent"] as const;

const GATE_DUTY_TABS: { id: GateDutyTab; label: string }[] = [
  { id: "MG", label: "Main Gate" },
  { id: "PG", label: "Pool Gate" },
  { id: "PBG", label: "Palm Beach Gate" },
  { id: "all", label: "All" },
  { id: "traitors", label: "Traitors" },
];

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

/** Rebuild an ES/EG textarea from prefects currently marked with that status. */
function buildExcuseListFromStatuses(
  entries: GateEntry[],
  statusOf: (entry: GateEntry) => string,
  status: "ES" | "EG"
): string {
  return entries
    .filter((entry) => statusOf(entry) === status)
    .map((entry) => (entry.code || entry.name || entry.pin).trim())
    .filter(Boolean)
    .join("\n");
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
  const [slotDrafts, setSlotDrafts] = useState<{
    second: Record<number, string>;
    third: Record<number, string>;
  }>({ second: {}, third: {} });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Excuses modal
  const [excusesOpen, setExcusesOpen] = useState(false);
  const [esList, setEsList] = useState("");
  const [egList, setEgList] = useState("");
  const [excusing, setExcusing] = useState(false);
  const [excuseError, setExcuseError] = useState<string | null>(null);
  const [showLatecomers, setShowLatecomers] = useState(false);
  const esTextareaRef = useRef<HTMLTextAreaElement>(null);
  const egTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!date) return;
    try {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      const res = await fetch(apiUrl(`/api/attendance/date/${date}`));
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      const json = await res.json();
      setData(json);
      setDrafts({});
      setSlotDrafts({ second: {}, third: {} });
      if (!options?.silent) {
        setSaveNotice(null);
        setSaveError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSaveError(null);
    setSaveNotice(null);
  }, [activeTab]);

  // Editable when unsaved, or when superuser after save
  const canEditStatuses =
    !!data && (!data.gateSaved || canEditAfterSave) && canWrite;

  function canEditSlot(slot: AttendanceSlot): boolean {
    if (!data || !canWrite) return false;
    const saved = data.slotAttendance?.[slot]?.saved;
    return !saved || canEditAfterSave;
  }

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
      // Prefer live DOM values so paste + click cannot race React state.
      const esText = esTextareaRef.current?.value ?? esList;
      const egText = egTextareaRef.current?.value ?? egList;
      setEsList(esText);
      setEgList(egText);

      if (!esText.trim() && !egText.trim()) {
        throw new Error("Enter at least one code, name, or PIN in ES or EG.");
      }

      setSaving(true);
      setSaveError(null);
      const res = await fetch(
        apiUrl(`/api/gate-attendance/${data.date}/excuses`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es: esText, eg: egText }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json && json.error) || "Failed to apply excuses"
        );
      }

      const appliedEs = Number(json.appliedEs) || 0;
      const appliedEg = Number(json.appliedEg) || 0;
      const unmatched: string[] = Array.isArray(json.unmatched)
        ? json.unmatched
        : [];

      const unmatchedNote =
        unmatched.length > 0
          ? ` Unmatched (skipped, Traitor fill not run): ${unmatched.slice(0, 6).join(", ")}${unmatched.length > 6 ? "…" : ""}.`
          : "";
      setSaveNotice(
        unmatched.length > 0
          ? `Applied ES to ${appliedEs} and EG to ${appliedEg} prefect(s).${unmatchedNote}`
          : `Applied ES to ${appliedEs} and EG to ${appliedEg} prefect(s). Unmarked leftovers set to Traitor.`
      );
      setExcusesOpen(false);
      await fetchData({ silent: true });
    } catch (err) {
      setExcuseError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExcusing(false);
      setSaving(false);
    }
  }

  function openExcusesModal() {
    if (!data) return;
    const statusOf = (entry: GateEntry) =>
      drafts[entry.prefectId] ??
      entry.status ??
      entry.defaultStatus ??
      "To be marked";
    setEsList(buildExcuseListFromStatuses(data.gateEntries, statusOf, "ES"));
    setEgList(buildExcuseListFromStatuses(data.gateEntries, statusOf, "EG"));
    setExcuseError(null);
    setExcusesOpen(true);
  }

  function gateValue(entry: GateEntry): string {
    return (
      drafts[entry.prefectId] ??
      entry.status ??
      entry.defaultStatus ??
      "To be marked"
    );
  }

  function slotValue(slot: AttendanceSlot, entry: SlotAttendanceEntry): string {
    return (
      slotDrafts[slot][entry.prefectId] ??
      entry.status ??
      entry.defaultStatus ??
      "Absent"
    );
  }

  async function handleSaveSlot(slot: AttendanceSlot) {
    if (!data || !canEditSlot(slot)) return;
    const block = data.slotAttendance?.[slot];
    if (!block) return;

    const entries = block.entries.map((entry) => ({
      prefectId: entry.prefectId,
      status: slotValue(slot, entry),
    }));

    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);

    const label = slot === "second" ? "11:15" : "1:30";

    try {
      const res = await fetch(
        apiUrl(`/api/slot-attendance/${data.date}/${slot}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries,
            force: block.saved && canEditAfterSave,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) await fetchData();
        throw new Error(json.error || `Failed to save ${label} attendance`);
      }
      setSaveNotice(
        block.saved
          ? `${label} attendance updated for ${formatDateDisplay(data.date)}.`
          : `${label} attendance saved for ${formatDateDisplay(data.date)}.`
      );
      await fetchData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------
  // Derived
  // -------------------------------------------------------

  const morning = data?.slots.morning || [];
  const second = data?.slots.second || [];
  const third = data?.slots.third || [];
  const latecomers = morning.filter((m) => m.late);
  const lateCount = latecomers.length;
  const displayedMorning = showLatecomers ? latecomers : morning;
  const secondAttendance = data?.slotAttendance?.second;
  const thirdAttendance = data?.slotAttendance?.third;
  const gateSaved = !!data?.gateSaved;
  const showExcuseButton = gateSaved && canWrite;
  const showStatusSelects = canEditStatuses;
  const hasExistingExcuses = (data?.gateEntries || []).some((entry) => {
    const status = gateValue(entry);
    return status === "ES" || status === "EG";
  });

  const gateCounts: Record<string, number> = {};
  for (const entry of data?.gateEntries || []) {
    const status = gateValue(entry);
    if (status) gateCounts[status] = (gateCounts[status] || 0) + 1;
  }

  const visibleGateEntries = (data?.gateEntries || []).filter((entry) => {
    if (gateDutyTab === "all") return true;
    if (gateDutyTab === "traitors") return gateValue(entry) === "Traitor";
    return entry.gateAssignment === gateDutyTab && entry.signedIn;
  });

  const gateDutyEmptyMessage =
    gateDutyTab === "all"
      ? "No prefects registered yet. Add house prefects first."
      : gateDutyTab === "traitors"
        ? "No traitors marked for this day."
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
              <Link href="/batches" role="menuitem" className={headerMenuItemClass}>
                Batches
              </Link>
              <Link href="/gate-sheet" role="menuitem" className={headerMenuItemClass}>
                Gate Sheet
              </Link>
              <Link href="/settings" role="menuitem" className={headerMenuItemClass}>
                <IconSettings className="w-3 h-3" />
                Settings
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
                onClick={() => setActiveTab("second")}
                className={`flex-1 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === "second"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                11.15 Sign-in
                {secondAttendance?.saved && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white align-middle">
                    Saved
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("third")}
                className={`flex-1 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === "third"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                1.30 Sign-in
                {thirdAttendance?.saved && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white align-middle">
                    Saved
                  </span>
                )}
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
                      {(data.batches || []).length > 0
                        ? `Batch times; others by 7:00 AM`
                        : "Late after 7:00 AM (no batches)"}
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

                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLatecomers((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      showLatecomers
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {showLatecomers
                      ? "Show all"
                      : `Show latecomers${lateCount > 0 ? ` (${lateCount})` : ""}`}
                  </button>
                </div>

                {/* Morning sign-in table */}
                {morning.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-700">
                      No morning sign-ins on this date
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      House prefects who scanned their fingerprint before 10:50
                      AM appear here.
                    </p>
                  </div>
                ) : showLatecomers && displayedMorning.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-700">
                      No latecomers on this date
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Every morning sign-in was on time.
                    </p>
                  </div>
                ) : (
                  <SignInTable
                    title={
                      showLatecomers
                        ? `Latecomers (${displayedMorning.length})`
                        : `Morning Check-in Times (${morning.length})`
                    }
                    subtitle={
                      (data.batches || []).length > 0
                        ? `Batch gate/extended: ${(data.batches || [])
                            .map(
                              (b) =>
                                `${b.name} ${toTimeNoSeconds(`${b.morningSigninTime}:00`)}`
                            )
                            .join(" · ")}; otherwise after 7:00 AM`
                        : "Late after 7:00 AM"
                    }
                    entries={displayedMorning}
                  />
                )}
              </div>
            )}

            {/* ================= 11.15 Sign-in tab ================= */}
            {activeTab === "second" && secondAttendance && (
              <SlotAttendancePanel
                label="11:15"
                cutoffCopy="After 10:50 AM"
                block={secondAttendance}
                signedInCount={second.length}
                slotValue={(entry) => slotValue("second", entry)}
                canEdit={canEditSlot("second")}
                canWrite={canWrite}
                saving={saving}
                saveError={activeTab === "second" ? saveError : null}
                saveNotice={activeTab === "second" ? saveNotice : null}
                onStatusChange={(prefectId, status) =>
                  setSlotDrafts((prev) => ({
                    ...prev,
                    second: { ...prev.second, [prefectId]: status },
                  }))
                }
                onSave={() => handleSaveSlot("second")}
                canEditAfterSave={canEditAfterSave}
              />
            )}

            {/* ================= 1.30 Sign-in tab ================= */}
            {activeTab === "third" && thirdAttendance && (
              <SlotAttendancePanel
                label="1:30"
                cutoffCopy="After 1:15 PM"
                block={thirdAttendance}
                signedInCount={third.length}
                slotValue={(entry) => slotValue("third", entry)}
                canEdit={canEditSlot("third")}
                canWrite={canWrite}
                saving={saving}
                saveError={activeTab === "third" ? saveError : null}
                saveNotice={activeTab === "third" ? saveNotice : null}
                onStatusChange={(prefectId, status) =>
                  setSlotDrafts((prev) => ({
                    ...prev,
                    third: { ...prev.third, [prefectId]: status },
                  }))
                }
                onSave={() => handleSaveSlot("third")}
                canEditAfterSave={canEditAfterSave}
              />
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
                          onClick={openExcusesModal}
                          className="px-5 py-2.5 rounded-md bg-white text-slate-800 text-sm font-semibold border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          {hasExistingExcuses ? "Edit excuses" : "Add excuses"}
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
                            : tab.id === "traitors"
                              ? data.gateEntries.filter(
                                  (e) => gateValue(e) === "Traitor"
                                ).length
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
                                ? tab.id === "traitors"
                                  ? "border-rose-600 text-rose-700 bg-rose-50/60"
                                  : "border-brand-600 text-brand-700 bg-brand-50/60"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {tab.label}
                            <span
                              className={`ml-1.5 text-[11px] ${
                                active
                                  ? tab.id === "traitors"
                                    ? "text-rose-600"
                                    : "text-brand-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {gateDutyTab !== "all" && gateDutyTab !== "traitors" && (
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
                    {gateDutyTab === "traitors" && (
                      <p className="text-xs text-slate-400 pb-3 pt-1">
                        Prefects marked Traitor for this day (typically after
                        excuses are applied).
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
            Enter one prefect code, full name, surname, or PIN per line
            (commas also work). Prefects in these lists become ES or EG
            (including those currently Present). Late may be overwritten by EG
            only. When every line matches, remaining unmarked prefects become
            Traitor.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-es" className="text-sm font-medium text-slate-700">
              ES
            </label>
            <textarea
              id="excuse-es"
              ref={esTextareaRef}
              rows={EXCUSE_TEXTAREA_ROWS}
              value={esList}
              onChange={(e) => setEsList(e.target.value)}
              placeholder={"One code, name, or PIN per line"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none overflow-y-auto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-eg" className="text-sm font-medium text-slate-700">
              EG
            </label>
            <textarea
              id="excuse-eg"
              ref={egTextareaRef}
              rows={EXCUSE_TEXTAREA_ROWS}
              value={egList}
              onChange={(e) => setEgList(e.target.value)}
              placeholder={"One code, name, or PIN per line"}
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
// Slot attendance panel (11:15 / 1:30 Present|Absent)
// -------------------------------------------------------

function SlotAttendancePanel({
  label,
  cutoffCopy,
  block,
  signedInCount,
  slotValue,
  canEdit,
  canWrite,
  saving,
  saveError,
  saveNotice,
  onStatusChange,
  onSave,
  canEditAfterSave,
}: {
  label: string;
  cutoffCopy: string;
  block: SlotAttendanceBlock;
  signedInCount: number;
  slotValue: (entry: SlotAttendanceEntry) => string;
  canEdit: boolean;
  canWrite: boolean;
  saving: boolean;
  saveError: string | null;
  saveNotice: string | null;
  onStatusChange: (prefectId: number, status: string) => void;
  onSave: () => void;
  canEditAfterSave: boolean;
}) {
  const presentCount = block.entries.filter(
    (e) => slotValue(e) === "Present"
  ).length;
  const absentCount = block.entries.filter(
    (e) => slotValue(e) === "Absent"
  ).length;

  return (
    <div>
      {block.saved ? (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          <strong>Saved</strong> — {label} attendance for this date has been
          saved.
          {canEditAfterSave
            ? " As a superuser you can still change statuses."
            : canWrite
              ? " This session is view-only."
              : " This date is view-only."}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg text-brand-800 text-sm">
          {canWrite ? (
            <>
              Mark each prefect Present or Absent, then press{" "}
              <strong>Save Attendance</strong>. Prefects who signed in default
              to Present; others default to Absent.
            </>
          ) : (
            <>You have view-only access to {label} attendance.</>
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">{label} sign-ins</p>
          <p className="text-2xl font-semibold text-slate-900">{signedInCount}</p>
          <p className="text-xs text-slate-400 mt-1">{cutoffCopy}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Present</p>
          <p className="text-2xl font-semibold text-emerald-700">{presentCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Absent</p>
          <p className="text-2xl font-semibold text-red-600">{absentCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">
              {label} Attendance ({block.entries.length} prefects)
            </h3>
            <p className="text-xs text-slate-400 mt-1">{cutoffCopy}</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || block.entries.length === 0}
              className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : block.saved ? (
                "Update Attendance"
              ) : (
                "Save Attendance"
              )}
            </button>
          )}
        </div>

        {block.entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No prefects registered yet. Add house prefects first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    Prefect
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    Sign-in time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    {canEdit ? "Mark status" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {block.entries.map((entry, idx) => {
                  const value = slotValue(entry);
                  return (
                    <tr
                      key={entry.prefectId}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-slate-400 font-mono hidden sm:table-cell">
                        {idx + 1}
                      </td>
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
                                <span className="mr-2 font-medium text-slate-500">
                                  {entry.class}
                                </span>
                              )}
                              <span className="font-mono">PIN: {entry.pin}</span>
                              {entry.code && (
                                <span className="ml-2 font-mono">
                                  Code: {entry.code}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {entry.time ? (
                          <span className="text-sm font-mono font-medium text-slate-700">
                            {toDisplayTime(entry.time)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {canEdit ? (
                          <select
                            value={value}
                            onChange={(e) =>
                              onStatusChange(entry.prefectId, e.target.value)
                            }
                            className={`px-3 py-2 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors ${GATE_STATUS_STYLES[value] || "bg-white border-slate-300 text-slate-700"}`}
                          >
                            {SLOT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${GATE_STATUS_STYLES[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            {value}
                          </span>
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
