"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { formatDateDisplay } from "@/lib/time";
import { useAuth, isAdminOrAbove, isSuperuser } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { SearchField } from "@/components/ui/SearchField";
import { PageSkeleton, RefreshBar } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { ExcusesModal } from "./ExcusesModal";
import { GateTab } from "./GateTab";
import { MorningTab } from "./MorningTab";
import { SlotAttendancePanel } from "./SlotAttendancePanel";
import { buildExcuseListFromStatuses, mergeExcuseLists } from "./excuseLists";
import { GATE_DUTY_TABS, type AttendanceSlot, type DayData, type GateDutyTab, type GateEntry, type SlotAttendanceEntry, type Tab } from "./types";

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);

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
  const [query, setQuery] = useState("");
  const esTextareaRef = useRef<HTMLTextAreaElement>(null);
  const egTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!date) return;
    // A refresh keeps the current day on screen. The skeleton is only
    // for the first visit, before there is anything to look at.
    const quiet = options?.silent || hasData.current;
    try {
      if (quiet) setRefreshing(true);
      else {
        setLoading(true);
        setError(null);
      }

      const res = await fetch(apiUrl(`/api/attendance/date/${date}`));
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      const json = await res.json();
      hasData.current = true;
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
      setLoading(false);
      setRefreshing(false);
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

    const updating = data.gateSaved && canEditAfterSave;
    const entries = data.gateEntries.flatMap((entry) => {
      const status =
        drafts[entry.prefectId] ??
        entry.status ??
        entry.defaultStatus ??
        "To be marked";
      const saved = entry.status ?? entry.defaultStatus ?? "To be marked";
      if (updating && status === saved) return [];
      return [{ prefectId: entry.prefectId, status }];
    });

    if (entries.length === 0) {
      setSaveError(null);
      setSaveNotice("No status changes to save.");
      return;
    }

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
          : `Applied ES to ${appliedEs} and EG to ${appliedEg} prefect(s). Unmarked prefects with no morning sign-in set to Traitor; those without gate duty set to Present; remaining gate-duty leftovers set to Absent.`
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
    const fromStatusesEs = buildExcuseListFromStatuses(
      data.gateEntries,
      statusOf,
      "ES"
    );
    const fromStatusesEg = buildExcuseListFromStatuses(
      data.gateEntries,
      statusOf,
      "EG"
    );
    setEsList(mergeExcuseLists(data.leaveExcuses?.es || "", fromStatusesEs));
    setEgList(mergeExcuseLists(data.leaveExcuses?.eg || "", fromStatusesEg));
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

    const updating = block.saved && canEditAfterSave;
    const entries = block.entries.flatMap((entry) => {
      const status = slotValue(slot, entry);
      const saved = entry.status ?? entry.defaultStatus ?? "Absent";
      if (updating && status === saved) return [];
      return [{ prefectId: entry.prefectId, status }];
    });

    if (entries.length === 0) {
      setSaveError(null);
      setSaveNotice("No status changes to save.");
      return;
    }

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
  const displayedMorning = useMemo(() => {
    const base = showLatecomers ? latecomers : morning;
    return base.filter((entry) =>
      matchesSearch(
        query,
        entry.name,
        entry.class,
        entry.code,
        entry.pin
      )
    );
  }, [showLatecomers, latecomers, morning, query]);
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
    if (gateDutyTab === "all") {
      // fall through to search
    } else if (gateDutyTab === "traitors") {
      if (gateValue(entry) !== "Traitor") return false;
    } else if (!(entry.gateAssignment === gateDutyTab && entry.signedIn)) {
      return false;
    }
    return matchesSearch(
      query,
      entry.name,
      entry.class,
      entry.code,
      entry.pin,
      entry.gateAssignment,
      gateValue(entry)
    );
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
          <RefreshButton onClick={() => { void fetchData({ silent: true }); }} />
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RefreshBar active={refreshing} />

        {loading && !data && (
          <PageSkeleton variant="table" label="Loading records" />
        )}

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {data && (
          <>
            <TabBar<Tab>
              ariaLabel="Attendance slots"
              value={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "morning", label: "Morning Check-in" },
                {
                  id: "second",
                  label: (
                    <>
                      11.15 Sign-in
                      {secondAttendance?.saved && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-600 text-white align-middle">
                          Saved
                        </span>
                      )}
                    </>
                  ),
                },
                {
                  id: "third",
                  label: (
                    <>
                      1.30 Sign-in
                      {thirdAttendance?.saved && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-600 text-white align-middle">
                          Saved
                        </span>
                      )}
                    </>
                  ),
                },
                {
                  id: "gate",
                  label: (
                    <>
                      Gate Attendance
                      {gateSaved && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-600 text-white align-middle">
                          Saved
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
            />

            <SearchField
              id="day-attendance-search"
              label="Search prefects"
              value={query}
              onChange={setQuery}
              placeholder="Search by name, class, code or PIN…"
              className="mb-6 w-full sm:max-w-sm"
            />

            {activeTab === "morning" && (
              <MorningTab
                data={data}
                morning={morning}
                second={second}
                third={third}
                lateCount={lateCount}
                showLatecomers={showLatecomers}
                setShowLatecomers={setShowLatecomers}
                displayedMorning={displayedMorning}
                query={query}
              />
            )}


            {/* ================= 11.15 Sign-in tab ================= */}
            {activeTab === "second" &&
              (secondAttendance ? (
                <SlotAttendancePanel
                  label="11:15"
                  cutoffCopy="After 10:50 AM"
                  block={secondAttendance}
                  signedInCount={second.length}
                  query={query}
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
              ) : (
                <div className="p-10 text-center text-sm text-slate-500 bg-white rounded-lg border border-slate-200">
                  11:15 attendance data is missing from the API. Redeploy the
                  server (rebuild <code className="font-mono text-xs">server.js</code>{" "}
                  if you run with Node) and ensure the{" "}
                  <code className="font-mono text-xs">slot_attendance</code>{" "}
                  migration has been applied.
                </div>
              ))}

            {/* ================= 1.30 Sign-in tab ================= */}
            {activeTab === "third" &&
              (thirdAttendance ? (
                <SlotAttendancePanel
                  label="1:30"
                  cutoffCopy="After 1:00 PM"
                  block={thirdAttendance}
                  signedInCount={third.length}
                  query={query}
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
              ) : (
                <div className="p-10 text-center text-sm text-slate-500 bg-white rounded-lg border border-slate-200">
                  1:30 attendance data is missing from the API. Redeploy the
                  server (rebuild <code className="font-mono text-xs">server.js</code>{" "}
                  if you run with Node) and ensure the{" "}
                  <code className="font-mono text-xs">slot_attendance</code>{" "}
                  migration has been applied.
                </div>
              ))}

            {activeTab === "gate" && (
              <GateTab
                data={data}
                gateSaved={gateSaved}
                canEditAfterSave={canEditAfterSave}
                canWrite={canWrite}
                saveError={saveError}
                saveNotice={saveNotice}
                gateCounts={gateCounts}
                showExcuseButton={showExcuseButton}
                openExcusesModal={openExcusesModal}
                hasExistingExcuses={hasExistingExcuses}
                showStatusSelects={showStatusSelects}
                handleSaveGate={handleSaveGate}
                saving={saving}
                gateDutyTab={gateDutyTab}
                setGateDutyTab={setGateDutyTab}
                gateValue={gateValue}
                visibleGateEntries={visibleGateEntries}
                query={query}
                gateDutyEmptyMessage={gateDutyEmptyMessage}
                setDrafts={setDrafts}
              />
            )}

          </>
        )}
      </main>

      <ExcusesModal
        excusesOpen={excusesOpen}
        excusing={excusing}
        setExcusesOpen={setExcusesOpen}
        esTextareaRef={esTextareaRef}
        esList={esList}
        setEsList={setEsList}
        egTextareaRef={egTextareaRef}
        egList={egList}
        setEgList={setEgList}
        excuseError={excuseError}
        handleExcuse={handleExcuse}
        saving={saving}
      />
    </div>
  );
}

