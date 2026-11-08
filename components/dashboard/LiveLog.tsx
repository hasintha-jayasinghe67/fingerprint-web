"use client";

import type { Dispatch, SetStateAction } from "react";
import { formatClock } from "@/lib/time";
import { SearchField } from "@/components/ui/SearchField";
import { IconClose } from "@/components/icons";
import {
  eventIsLate,
  getStatusColor,
  getStatusLabel,
  getVerifyLabel,
  type AttendanceEvent,
} from "./attendanceStatus";

/** Today's punch table, including the latecomer filter and on-the-spot excuses. */
export function LiveLog({
  events,
  displayedEvents,
  query,
  setQuery,
  showLatecomers,
  setShowLatecomers,
  latecomerCount,
  lastRefresh,
  excuseError,
  setExcuseError,
  canWrite,
  excusingPin,
  handleLateExcusal,
}: {
  events: AttendanceEvent[];
  displayedEvents: AttendanceEvent[];
  query: string;
  setQuery: (value: string) => void;
  showLatecomers: boolean;
  setShowLatecomers: Dispatch<SetStateAction<boolean>>;
  latecomerCount: number;
  lastRefresh: Date | null;
  excuseError: string | null;
  setExcuseError: (value: string | null) => void;
  canWrite: boolean;
  excusingPin: string | null;
  handleLateExcusal: (event: AttendanceEvent, excuse: boolean) => void;
}) {
  return (
    <>
        {/* Attendance Table */}
        {events.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">
                {query.trim()
                  ? `${showLatecomers ? "Latecomers" : "Attendance log"} (${displayedEvents.length} of ${showLatecomers ? latecomerCount : events.length})`
                  : showLatecomers
                    ? `Latecomers (${displayedEvents.length})`
                    : `Attendance log (${events.length} records)`}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLatecomers((v) => !v)}
                  className={`min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                    showLatecomers
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {showLatecomers
                    ? "Show all"
                    : `Show latecomers${latecomerCount > 0 ? ` (${latecomerCount})` : ""}`}
                </button>
                {lastRefresh && (
                  <p className="text-xs text-slate-600">
                    Last updated:{" "}
                    {lastRefresh.toLocaleTimeString("en-US", {
                      timeZone: "Asia/Colombo",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
              </div>
              <SearchField
                id="today-attendance-search"
                label="Search attendance"
                value={query}
                onChange={setQuery}
                placeholder="Name, class, code, or PIN"
              />
            </div>
            {excuseError && (
              <div role="alert" className="px-6 py-3 text-sm border-b bg-red-50 border-red-100 text-red-700">
                {excuseError}
                <button type="button" onClick={() => setExcuseError(null)} className="ml-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-md" aria-label="Dismiss">
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            )}
            {displayedEvents.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {query.trim()
                    ? "No matching records"
                    : showLatecomers
                      ? "No latecomers today"
                      : "No attendance records today"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {query.trim()
                    ? `Nothing in today's log matches “${query.trim()}”.`
                    : showLatecomers
                      ? "Every morning sign-in so far was on time."
                      : "Waiting for fingerprint scans."}
                </p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      Time (SL)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                      Device SN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedEvents.map((event, idx) => (
                    <tr
                      key={`${event.pin}-${event.timestamp}-${idx}`}
                      className={`transition-colors ${
                        event.suspended && eventIsLate(event)
                          ? "bg-violet-50/70 hover:bg-violet-50"
                          : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="px-6 py-3.5 text-sm text-slate-600 font-mono hidden md:table-cell">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                            {event.name
                              ? event.name.charAt(0).toUpperCase()
                              : event.pin.slice(-2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {event.name || `User ${event.pin}`}
                            </p>
                            <p className="text-xs text-slate-600 font-mono">
                              PIN: {event.pin}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-mono font-medium ${
                              event.suspended && eventIsLate(event)
                                ? "text-violet-700"
                                : "text-slate-700"
                            }`}
                          >
                            {formatClock(event.timestamp)}
                          </span>
                          {eventIsLate(event) &&
                            (event.suspended ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-600 text-white">
                                SUSPENDED · LATE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                                LATE
                              </span>
                            ))}
                          {eventIsLate(event) && canWrite && (
                            <button
                              type="button"
                              onClick={() => handleLateExcusal(event, true)}
                              disabled={excusingPin === event.pin}
                              aria-label={`Excuse ${event.name || event.pin}`}
                              title="Excused on the spot: remove the late mark for today"
                              className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              {excusingPin === event.pin ? "..." : "Excuse"}
                            </button>
                          )}
                          {event.lateExcused && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              LATE EXCUSED
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => handleLateExcusal(event, false)}
                                  disabled={excusingPin === event.pin}
                                  aria-label={`Undo excuse for ${event.name || event.pin}`}
                                  className="min-h-11 inline-flex items-center px-2 font-medium text-slate-700 underline hover:text-slate-900 disabled:opacity-50"
                                >
                                  {excusingPin === event.pin ? "..." : "Undo"}
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        {event.suspended && event.deadline && (
                          <p className="text-xs text-violet-600 mt-0.5">
                            Suspended · due by {formatClock(event.deadline, false)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          {getVerifyLabel(event.verifyMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-mono hidden lg:table-cell">
                        {event.deviceSN}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

    </>
  );
}
