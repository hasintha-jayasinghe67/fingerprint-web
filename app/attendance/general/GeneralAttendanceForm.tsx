"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { matchesSearch } from "@/lib/search";
import {
  DEFAULT_GATE_STATUS,
  GATE_STATUSES,
  GATE_STATUS_STYLES,
} from "@/lib/gateStatuses";
import {
  avatarChar,
  isExcusedStatus,
  matchPrefectList,
} from "./helpers";

export interface GeneralPrefectEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  status: string;
}

export type GeneralAttendanceTab = "manual" | "paste";

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
  const [query, setQuery] = useState("");
  const [excusedList, setExcusedList] = useState("");
  const [presentList, setPresentList] = useState("");
  const [pasteTouched, setPasteTouched] = useState(false);

  const excusedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const presentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesSearch(
          query,
          entry.name,
          entry.class,
          entry.code,
          entry.pin,
          entry.status,
          isExcusedStatus(entry.status) ? "Excused" : ""
        )
      ),
    [entries, query]
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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800">
                Paste excused &amp; present lists
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Paste one code, full name, surname, or PIN per line (commas also
                work). Any prefect not in the present or excused list will be
                marked as <strong className="text-red-700">Traitor</strong> when
                saved.
              </p>
            </div>
            {(presentList.trim() || excusedList.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setPresentList("");
                  setExcusedList("");
                  setPasteTouched(true);
                }}
                className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Clear lists
              </button>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="general-excused-list"
                  className="text-sm font-medium text-slate-700"
                >
                  Excused list
                </label>
                <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  {pastePreview.excusedCount} matched
                </span>
              </div>
              <textarea
                id="general-excused-list"
                ref={excusedTextareaRef}
                rows={10}
                value={excusedList}
                onChange={(e) => {
                  setExcusedList(e.target.value);
                  setPasteTouched(true);
                }}
                placeholder={
                  "Paste excused prefects here…\nOne code, name, or PIN per line"
                }
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm font-mono placeholder:text-slate-500 resize-y min-h-[12rem]"
              />
              {pastePreview.excusedMatch.unmatchedTokens.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Unmatched in excused list:{" "}
                  <span className="font-mono">
                    {pastePreview.excusedMatch.unmatchedTokens
                      .slice(0, 6)
                      .join(", ")}
                    {pastePreview.excusedMatch.unmatchedTokens.length > 6
                      ? "…"
                      : ""}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="general-present-list"
                  className="text-sm font-medium text-slate-700"
                >
                  Present list
                </label>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {pastePreview.presentCount} matched
                </span>
              </div>
              <textarea
                id="general-present-list"
                ref={presentTextareaRef}
                rows={10}
                value={presentList}
                onChange={(e) => {
                  setPresentList(e.target.value);
                  setPasteTouched(true);
                }}
                placeholder={
                  "Paste present prefects here…\nOne code, name, or PIN per line"
                }
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm font-mono placeholder:text-slate-500 resize-y min-h-[12rem]"
              />
              {pastePreview.presentMatch.unmatchedTokens.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Unmatched in present list:{" "}
                  <span className="font-mono">
                    {pastePreview.presentMatch.unmatchedTokens
                      .slice(0, 6)
                      .join(", ")}
                    {pastePreview.presentMatch.unmatchedTokens.length > 6
                      ? "…"
                      : ""}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Present: {pastePreview.presentCount}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              Excused: {pastePreview.excusedCount}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              Traitors (remaining): {pastePreview.traitorCount}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">
                House prefects ({entries.length})
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Mark each prefect with the same statuses used for gate attendance.
              </p>
            </div>
            {entries.length > 0 && (
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, class, code or PIN…"
                aria-label="Search prefects in this attendance record"
                className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm"
              />
            )}
          </div>

          {entries.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500 text-center">
              No prefects registered yet. Add house prefects first.
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500 text-center">
              No prefects match “{query.trim()}”.
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
                      {canWrite ? "Mark status" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleEntries.map((entry, idx) => {
                    const value = entry.status || DEFAULT_GATE_STATUS;
                    const isTraitor = value === "Traitor";
                    const isExcused = isExcusedStatus(value);
                    return (
                      <tr
                        key={entry.prefectId}
                        className={`transition-colors ${
                          isTraitor
                            ? "bg-red-50/60 hover:bg-red-50"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-6 py-3 text-sm text-slate-600 font-mono hidden sm:table-cell">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isTraitor
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {avatarChar(entry.name)}
                            </div>
                            <div>
                              <p
                                className={`text-sm font-medium ${
                                  isTraitor ? "text-red-800" : "text-slate-800"
                                }`}
                              >
                                {entry.name}
                              </p>
                              <p className="text-xs text-slate-600">
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
                          {canWrite ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={value}
                                onChange={(e) =>
                                  onStatusChange(entry.prefectId, e.target.value)
                                }
                                className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                                  isTraitor
                                    ? "bg-red-50 text-red-700 border-red-300 font-semibold"
                                    : isExcused
                                      ? "bg-sky-50 text-sky-700 border-sky-200"
                                      : GATE_STATUS_STYLES[value] ||
                                        "bg-white border-slate-300 text-slate-700"
                                }`}
                              >
                                {GATE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              {isTraitor && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                                  Traitor
                                </span>
                              )}
                              {isExcused && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
                                  Excused
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                isTraitor
                                  ? "bg-red-600 text-white border-red-700 font-semibold"
                                  : isExcused
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : GATE_STATUS_STYLES[value] ||
                                      "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {isExcused ? `Excused (${value})` : value}
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

