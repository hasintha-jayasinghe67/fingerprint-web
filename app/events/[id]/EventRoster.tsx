"use client";

import { formatClock } from "../helpers";
import type { EventPrefect, SpecialEventDetail } from "./types";

/** Live roll while excuses have not been saved yet. */
export function EventRoster({
  event,
  present,
  absent,
  query,
}: {
  event: SpecialEventDetail;
  present: EventPrefect[];
  absent: EventPrefect[];
  query: string;
}) {
  return (
    <>
{!event.excusesApplied && (
            <>
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Signed in ({present.length}
                  {query.trim() ? ` of ${event.present.length}` : ""})
                </h2>
              </div>
              {present.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">
                  {event.attendanceSaved
                    ? "No prefects scanned during this window."
                    : "No prefects have scanned during this window yet."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Prefect
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                          PIN
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Signed in
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {present.map((row) => (
                        <tr key={row.prefectId}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {[row.code, row.class].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell font-mono text-slate-700">
                            {row.pin}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800">
                            {row.time ? formatClock(row.time) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Not signed in ({absent.length}
                  {query.trim() ? ` of ${event.absent.length}` : ""})
                </h2>
              </div>
              {absent.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">
                  Everyone on the roll has scanned.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Prefect
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                          PIN
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absent.map((row) => (
                        <tr key={row.prefectId}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {[row.code, row.class].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell font-mono text-slate-700">
                            {row.pin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            </>
            )}
    </>
  );
}
