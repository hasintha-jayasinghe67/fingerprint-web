"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { matchesSearch } from "@/lib/search";
import { isExcusedStatus, matchPrefectList } from "./helpers";
import { ManualStatusList } from "./ManualStatusList";
import { PasteLists } from "./PasteLists";

export interface GeneralPrefectEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  status: string;
}

export type GeneralAttendanceTab = "manual" | "paste";
export type StatusListTab = "all" | "traitors" | "excused" | "present";

function matchesStatusListTab(status: string, tab: StatusListTab): boolean {
  if (tab === "all") return true;
  if (tab === "present") return status === "Present";
  if (tab === "excused") return isExcusedStatus(status);
  return status === "Traitor";
}

function buildListTextFromEntries(
  entries: GeneralPrefectEntry[],
  predicate: (status: string) => boolean
): string {
  return entries
    .filter((entry) => predicate(entry.status))
    .map((entry) => (entry.code || entry.name || entry.pin).trim())
    .filter(Boolean)
    .join("\n");
}

export default function GeneralAttendanceForm({
  name,
  date,
  entries,
  canWrite,
  submitting,
  error,
  submitLabel,
  cancelHref,
  showPasteTab = false,
  initialTab = "manual",
  onNameChange,
  onDateChange,
  onStatusChange,
  onEntriesChange,
  onSubmit,
}: {
  name: string;
  date: string;
  entries: GeneralPrefectEntry[];
  canWrite: boolean;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  cancelHref: string;
  showPasteTab?: boolean;
  initialTab?: GeneralAttendanceTab;
  onNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStatusChange: (prefectId: number, status: string) => void;
  onEntriesChange?: (entries: GeneralPrefectEntry[]) => void;
  onSubmit: (
    e: React.FormEvent,
    overrideEntries?: GeneralPrefectEntry[]
  ) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<GeneralAttendanceTab>(initialTab);
  const [statusListTab, setStatusListTab] = useState<StatusListTab>("all");
  const [query, setQuery] = useState("");
  const [excusedList, setExcusedList] = useState("");
  const [presentList, setPresentList] = useState("");
  const [pasteTouched, setPasteTouched] = useState(false);

  const excusedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const presentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const statusCounts = useMemo(() => {
    let present = 0;
    let excused = 0;
    let traitors = 0;
    for (const entry of entries) {
      if (entry.status === "Present") present += 1;
      else if (isExcusedStatus(entry.status)) excused += 1;
      else if (entry.status === "Traitor") traitors += 1;
    }
    return {
      all: entries.length,
      present,
      excused,
      traitors,
    };
  }, [entries]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (!matchesStatusListTab(entry.status, statusListTab)) return false;
        return matchesSearch(
          query,
          entry.name,
          entry.class,
          entry.code,
          entry.pin,
          entry.status,
          isExcusedStatus(entry.status) ? "Excused" : ""
        );
      }),
    [entries, query, statusListTab]
  );

  const pastePreview = useMemo(() => {
    const presentMatch = matchPrefectList(presentList, entries);
    const excusedMatch = matchPrefectList(excusedList, entries);

    let presentCount = 0;
    let excusedCount = 0;
    let traitorCount = 0;

    for (const entry of entries) {
      if (presentMatch.matchedIds.has(entry.prefectId)) {
        presentCount += 1;
      } else if (excusedMatch.matchedIds.has(entry.prefectId)) {
        excusedCount += 1;
      } else {
        traitorCount += 1;
      }
    }

    return {
      presentMatch,
      excusedMatch,
      presentCount,
      excusedCount,
      traitorCount,
    };
  }, [entries, presentList, excusedList]);

  function handleSelectTab(nextTab: GeneralAttendanceTab) {
    if (
      nextTab === "paste" &&
      !pasteTouched &&
      !presentList.trim() &&
      !excusedList.trim()
    ) {
      const existingPresent = buildListTextFromEntries(
        entries,
        (s) => s === "Present"
      );
      const existingExcused = buildListTextFromEntries(entries, (s) =>
        isExcusedStatus(s)
      );
      if (existingPresent || existingExcused) {
        setPresentList(existingPresent);
        setExcusedList(existingExcused);
      }
    }
    setActiveTab(nextTab);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (activeTab === "paste") {
      const liveExcused = excusedTextareaRef.current?.value ?? excusedList;
      const livePresent = presentTextareaRef.current?.value ?? presentList;
      setExcusedList(liveExcused);
      setPresentList(livePresent);

      const presentMatch = matchPrefectList(livePresent, entries);
      const excusedMatch = matchPrefectList(liveExcused, entries);

      const nextEntries = entries.map((entry) => {
        if (presentMatch.matchedIds.has(entry.prefectId)) {
          return { ...entry, status: "Present" };
        }
        if (excusedMatch.matchedIds.has(entry.prefectId)) {
          return { ...entry, status: "EG" };
        }
        return { ...entry, status: "Traitor" };
      });

      onEntriesChange?.(nextEntries);
      setActiveTab("manual");
      await onSubmit(e, nextEntries);
      return;
    }

    await onSubmit(e);
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {canWrite && showPasteTab && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          aria-label="General attendance entry mode"
        >
          <button
            type="button"
            aria-pressed={activeTab === "manual"}
            onClick={() => handleSelectTab("manual")}
            className={`shrink-0 min-h-11 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "manual"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Mark individually
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "paste"}
            onClick={() => handleSelectTab("paste")}
            className={`shrink-0 min-h-11 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "paste"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Paste lists
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <div>
          <label
            htmlFor="generalAttendanceName"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Name for attendance record
          </label>
          <input
            id="generalAttendanceName"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            disabled={!canWrite}
            placeholder="e.g. Sports meet duty"
            className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="generalAttendanceDate"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Date
          </label>
          <input
            id="generalAttendanceDate"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            required
            disabled={!canWrite}
            className="px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
      </div>

      {activeTab === "paste" && canWrite ? (
        <PasteLists
          presentList={presentList}
          setPresentList={setPresentList}
          excusedList={excusedList}
          setExcusedList={setExcusedList}
          setPasteTouched={setPasteTouched}
          presentTextareaRef={presentTextareaRef}
          excusedTextareaRef={excusedTextareaRef}
          pastePreview={pastePreview}
        />
      ) : (
        <ManualStatusList
          entries={entries}
          visibleEntries={visibleEntries}
          statusListTab={statusListTab}
          setStatusListTab={setStatusListTab}
          statusCounts={statusCounts}
          query={query}
          setQuery={setQuery}
          canWrite={canWrite}
          onStatusChange={onStatusChange}
        />
      )}


      <div className="flex flex-wrap gap-3">
        {canWrite && (
          <button
            type="submit"
            disabled={submitting || !name.trim() || !date}
            className="px-5 py-2.5 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving…" : submitLabel}
          </button>
        )}
        <Link
          href={cancelHref}
          className="px-5 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {canWrite ? "Cancel" : "Back"}
        </Link>
      </div>
    </form>
  );
}

