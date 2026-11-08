"use client";

import { formatRange, inputClass } from "./format";
import type { Prefect, Suspension } from "./types";

/** Ended suspensions, with name, code, and duration filters. */
export function PastSuspensions({
  pastName,
  setPastName,
  pastCode,
  setPastCode,
  minDays,
  setMinDays,
  maxDays,
  setMaxDays,
  loading,
  pastRows,
  pastFiltersActive,
  pastTotal,
}: {
  pastName: string;
  setPastName: (value: string) => void;
  pastCode: string;
  setPastCode: (value: string) => void;
  minDays: string;
  setMinDays: (value: string) => void;
  maxDays: string;
  setMaxDays: (value: string) => void;
  loading: boolean;
  pastRows: { suspension: Suspension & { endDate: string }; prefect: Prefect | null; days: number }[];
  pastFiltersActive: boolean;
  pastTotal: number;
}) {
  return (
<>
            {/* Past suspension filters */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input
                  type="search"
                  value={pastName}
                  onChange={(e) => setPastName(e.target.value)}
                  placeholder="Filter by name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Code</label>
                <input
                  type="search"
                  value={pastCode}
                  onChange={(e) => setPastCode(e.target.value)}
                  placeholder="Filter by code"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min duration (days)</label>
                <input
                  type="number"
                  min={1}
                  value={minDays}
                  onChange={(e) => setMinDays(e.target.value)}
                  placeholder="Any"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max duration (days)</label>
                <input
                  type="number"
                  min={1}
                  value={maxDays}
                  onChange={(e) => setMaxDays(e.target.value)}
                  placeholder="Any"
                  className={inputClass}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-800">
                    {pastRows.length} Past suspension{pastRows.length !== 1 ? "s" : ""}
                  </h2>
                  {pastFiltersActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setPastName("");
                        setPastCode("");
                        setMinDays("");
                        setMaxDays("");
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {pastRows.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500">
                    {pastTotal === 0
                      ? "No suspensions have ended yet."
                      : "No past suspensions match these filters."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Prefect</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Dates</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pastRows.map(({ suspension: s, prefect, days }) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                              <p className="text-sm font-medium text-slate-800">
                                {prefect?.name || `Prefect #${s.prefectId}`}
                              </p>
                              {prefect?.class && (
                                <p className="text-xs text-slate-500">{prefect.class}</p>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-600 font-mono hidden md:table-cell">
                              {prefect?.code || "—"}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-700">
                              {formatRange(s)}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-700">
                              {days} day{days !== 1 ? "s" : ""}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-slate-500 hidden lg:table-cell">
                              {s.reason || "—"}
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
