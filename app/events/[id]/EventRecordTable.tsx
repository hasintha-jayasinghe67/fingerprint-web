"use client";

import { GATE_STATUS_STYLES } from "@/lib/gateStatuses";
import { avatarChar, isExcusedStatus } from "@/app/attendance/general/helpers";
import { formatClock } from "../helpers";
import type { EventPrefect, SpecialEventDetail } from "./types";

/** Saved excuse record: present, excused, and traitor rows. */
export function EventRecordTable({
  event,
  recordEntries,
  query,
}: {
  event: SpecialEventDetail;
  recordEntries: EventPrefect[];
  query: string;
}) {
  return (
    <>
{event.excusesApplied && (
              <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Prefects ({recordEntries.length}
                    {query.trim() ? ` of ${event.entries?.length || 0}` : ""})
                  </h2>
                </div>
                {recordEntries.length === 0 ? (
                  <p className="p-6 text-sm text-slate-600">
                    {query.trim()
                      ? "No prefects match this search."
                      : "No prefects on this record."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                            #
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">
                            Prefect
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recordEntries.map((row, idx) => {
                          const status = row.status || "Traitor";
                          const isTraitor = status === "Traitor";
                          const isExcused = isExcusedStatus(status);
                          return (
                            <tr
                              key={row.prefectId}
                              className={
                                isTraitor ? "bg-red-50/60" : undefined
                              }
                            >
                              <td className="px-4 py-3 font-mono text-slate-600 hidden sm:table-cell">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                      isTraitor
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {avatarChar(row.name)}
                                  </div>
                                  <div>
                                    <p
                                      className={`font-medium ${
                                        isTraitor
                                          ? "text-red-800"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {row.name}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {[row.code, row.class]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                      {status === "Present" && row.time
                                        ? ` · ${formatClock(row.time)}`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    isTraitor
                                      ? "bg-red-600 text-white border-red-700"
                                      : isExcused
                                        ? "bg-sky-100 text-sky-800 border-sky-200"
                                        : GATE_STATUS_STYLES[status] ||
                                          "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {isExcused ? "Excused" : status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

                </>
  );
}
