"use client";

import {
  DEFAULT_GATE_STATUS,
  GATE_STATUSES,
  GATE_STATUS_STYLES,
} from "@/lib/gateStatuses";
import { avatarChar, isExcusedStatus } from "./helpers";
import type { GeneralPrefectEntry, StatusListTab } from "./GeneralAttendanceForm";

const STATUS_LIST_TABS: { id: StatusListTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "traitors", label: "Traitors" },
  { id: "excused", label: "Excused" },
  { id: "present", label: "Present" },
];

const STATUS_LIST_HINT: Record<StatusListTab, string> = {
  all: "Mark each prefect with the same statuses used for gate attendance.",
  traitors: "Prefects marked Traitor on this record.",
  excused: "Prefects marked excused (EG, ES, or Excused).",
  present: "Prefects marked Present on this record.",
};

const STATUS_LIST_EMPTY: Record<StatusListTab, string> = {
  all: "No prefects registered yet. Add house prefects first.",
  traitors: "No traitors marked on this record.",
  excused: "No excused prefects on this record.",
  present: "No prefects marked Present on this record.",
};


/** One-by-one status table for a general attendance record. */
export function ManualStatusList({
  entries,
  visibleEntries,
  statusListTab,
  setStatusListTab,
  statusCounts,
  query,
  setQuery,
  canWrite,
  onStatusChange,
}: {
  entries: GeneralPrefectEntry[];
  visibleEntries: GeneralPrefectEntry[];
  statusListTab: StatusListTab;
  setStatusListTab: (value: StatusListTab) => void;
  statusCounts: Record<StatusListTab, number>;
  query: string;
  setQuery: (value: string) => void;
  canWrite: boolean;
  onStatusChange: (prefectId: number, status: string) => void;
}) {
  return (
        <div className="space-y-3">
          {entries.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label="Attendance status lists"
          >
            {STATUS_LIST_TABS.map((tab) => {
              const active = statusListTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusListTab(tab.id)}
                  className={`shrink-0 min-h-11 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                    active
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs font-medium ${
                      active ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {statusCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>
          )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">
                House prefects (
                {query.trim()
                  ? `${visibleEntries.length} of ${statusCounts[statusListTab]}`
                  : statusCounts[statusListTab]}
                )
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {STATUS_LIST_HINT[statusListTab]}
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
            <div className="px-6 py-10 text-sm text-slate-600 text-center">
              {STATUS_LIST_EMPTY.all}
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-600 text-center">
              {query.trim()
                ? `No prefects match “${query.trim()}”.`
                : STATUS_LIST_EMPTY[statusListTab]}
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
        </div>
  );
}
