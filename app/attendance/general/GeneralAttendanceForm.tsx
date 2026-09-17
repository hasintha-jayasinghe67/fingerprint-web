"use client";

import Link from "next/link";
import {
  DEFAULT_GATE_STATUS,
  GATE_STATUSES,
  GATE_STATUS_STYLES,
} from "@/lib/gateStatuses";
import { avatarChar } from "./helpers";

export interface GeneralPrefectEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  status: string;
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
  onNameChange,
  onDateChange,
  onStatusChange,
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
  onNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStatusChange: (prefectId: number, status: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
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
            className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
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
            className="px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            House prefects ({entries.length})
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Mark each prefect with the same statuses used for gate attendance.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500 text-center">
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
                    {canWrite ? "Mark status" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => {
                  const value = entry.status || DEFAULT_GATE_STATUS;
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
                        {canWrite ? (
                          <select
                            value={value}
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

      <div className="flex flex-wrap gap-3">
        {canWrite && (
          <button
            type="submit"
            disabled={submitting || !name.trim() || !date}
            className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
