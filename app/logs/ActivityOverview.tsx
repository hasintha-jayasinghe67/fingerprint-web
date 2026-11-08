"use client";

import { LogStatCard as StatCard } from "./LogStatCard";
import type { AuditStats } from "./types";

const STATS_DAYS = 30;

/** Counts, daily bars, categories, and per-account activity. */
export function ActivityOverview({
  statsError,
  statsLoading,
  stats,
  daySeries,
  maxDayCount,
  categoryRows,
  maxCategoryCount,
}: {
  statsError: string | null;
  statsLoading: boolean;
  stats: AuditStats | null;
  daySeries: { date: string; count: number }[];
  maxDayCount: number;
  categoryRows: { key: string; label: string; count: number }[];
  maxCategoryCount: number;
}) {
  return (
    <>
        {statsError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700"
          >
            {statsError}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Logins (30 days)"
            value={statsLoading ? "…" : String(stats?.logins ?? 0)}
            hint="Successful and failed sign-ins"
          />
          <StatCard
            label="Writes (30 days)"
            value={statsLoading ? "…" : String(stats?.writes ?? 0)}
            hint={
              stats?.capped
                ? `Sampled first ${stats.sampled.toLocaleString()} rows`
                : "Database writes in the window"
            }
          />
          <StatCard
            label="Failed"
            value={statsLoading ? "…" : String(stats?.failed ?? 0)}
            hint="Rejected sign-ins and failed saves"
            tone={stats && stats.failed > 0 ? "warn" : "plain"}
          />
          <StatCard
            label="People"
            value={statsLoading ? "…" : String(stats?.uniqueUsers ?? 0)}
            hint="Distinct accounts in the log"
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Activity by day
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Sign-ins and writes, last {STATS_DAYS} days
            </p>
            {statsLoading ? (
              <p className="text-sm text-slate-600">Loading…</p>
            ) : (
              <div className="flex items-end gap-px h-24" aria-hidden="true">
                {daySeries.map((row) => (
                  <div
                    key={row.date}
                    title={`${row.date}: ${row.count}`}
                    className="flex-1 min-w-0 rounded-t-sm bg-brand-700/80"
                    style={{
                      height: `${Math.max(row.count === 0 ? 2 : 8, Math.round((row.count / maxDayCount) * 96))}%`,
                      opacity: row.count === 0 ? 0.18 : 1,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-xs font-mono text-slate-600">
              <span>{daySeries[0]?.date || ""}</span>
              <span>{daySeries[daySeries.length - 1]?.date || ""}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              By category
            </h3>
            <p className="text-xs text-slate-600 mb-4">What people changed</p>
            {statsLoading ? (
              <p className="text-sm text-slate-600">Loading…</p>
            ) : categoryRows.length === 0 ? (
              <p className="text-sm text-slate-600">No writes in this window.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categoryRows.map((row) => (
                  <li key={row.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-slate-700 truncate">
                      {row.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-700"
                        style={{
                          width: `${Math.max(6, Math.round((row.count / maxCategoryCount) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs text-slate-700">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Who did what
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Sign-ins and writes per account in the last {STATS_DAYS} days
            </p>
          </div>
          {statsLoading ? (
            <p className="p-6 text-sm text-slate-600">Loading…</p>
          ) : !stats || stats.users.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">No user activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">
                      User
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">
                      Logins
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">
                      Writes
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">
                      Failed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.users.map((row) => (
                    <tr key={row.username}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.username}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {row.logins}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {row.writes}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          row.failed > 0 ? "text-red-700" : "text-slate-600"
                        }`}
                      >
                        {row.failed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

    </>
  );
}
