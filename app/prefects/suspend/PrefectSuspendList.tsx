"use client";

import { IconRefresh } from "@/components/icons";
import { PersonCell } from "@/components/ui/PersonCell";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatRange, inputClass } from "./format";
import type { Filter, Prefect, Status, Suspension } from "./types";

/** Searchable prefect list with each person's suspension status. */
export function PrefectSuspendList({
  query,
  setQuery,
  filter,
  setFilter,
  counts,
  loading,
  prefects,
  visible,
  fetchAll,
  statusOf,
  suspensionsByPrefect,
  canWrite,
  openManage,
}: {
  query: string;
  setQuery: (value: string) => void;
  filter: Filter;
  setFilter: (value: Filter) => void;
  counts: { suspended: number; scheduled: number };
  loading: boolean;
  prefects: Prefect[];
  visible: Prefect[];
  fetchAll: () => void;
  statusOf: (prefectId: number) => { status: Status; current: Suspension | null };
  suspensionsByPrefect: Map<number, Suspension[]>;
  canWrite: boolean;
  openManage: (prefect: Prefect) => void;
}) {
  return (
<>
        {/* Search + filter */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, class, code or PIN..."
            autoFocus
            className={`flex-1 ${inputClass}`}
          />
          <div className="inline-flex rounded-md border border-slate-300 bg-white overflow-hidden text-sm shrink-0">
            {(["all", "active", "suspended", "scheduled"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3.5 py-2 font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "suspended" || f === "scheduled" ? `${f} (${counts[f]})` : f}
              </button>
            ))}
          </div>
        </div>

        {loading && prefects.length === 0 && (
          <PageSkeleton variant="rows" label="Loading suspensions" />
        )}

        {!loading && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {visible.length} Prefect{visible.length !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => { void fetchAll(); }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <IconRefresh className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {visible.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No prefects match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">PIN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((p) => {
                      const { status, current } = statusOf(p.id);
                      const historyCount = suspensionsByPrefect.get(p.id)?.length || 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <PersonCell name={p.name} avatar={p.name.charAt(0).toUpperCase()} />
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-600 hidden md:table-cell">
                            {p.class || "—"}
                          </td>
                          <td className="px-6 py-3.5 text-sm font-mono font-medium text-slate-700">
                            {p.pin}
                          </td>
                          <td className="px-6 py-3.5">
                            {status === "suspended" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                Suspended
                              </span>
                            ) : status === "scheduled" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Scheduled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                            {current && (
                              <p className="text-xs text-slate-500 mt-1">{formatRange(current)}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {(canWrite || historyCount > 0) && (
                              <button
                                onClick={() => openManage(p)}
                                className={`min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium border transition-colors ${
                                  canWrite && status === "active"
                                    ? "bg-white text-violet-700 border-violet-300 hover:bg-violet-50"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {canWrite && status === "active" ? "Suspend" : "Manage"}
                                {historyCount > 0 && ` (${historyCount})`}
                              </button>
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
        </>
  );
}
