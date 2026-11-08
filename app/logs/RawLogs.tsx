"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AUDIT_CATEGORIES, categoryLabel } from "@/lib/auditLabels";
import { PageSkeleton, RefreshBar } from "@/components/ui/Skeleton";
import { LogRow } from "./LogRow";
import type { AuditLog, AuditStats } from "./types";

const PAGE_SIZE = 50;
const fieldClass =
  "w-full min-h-11 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-600";

/** Filters and the expandable write log. */
export function RawLogs({
  search,
  setSearch,
  setSearchApplied,
  setOffset,
  category,
  setCategory,
  actor,
  setActor,
  stats,
  success,
  setSuccess,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  clearFilters,
  logsError,
  logsLoading,
  logs,
  offset,
  expandedId,
  setExpandedId,
  total,
  pageStart,
  pageEnd,
}: {
  search: string;
  setSearch: (value: string) => void;
  setSearchApplied: (value: string) => void;
  setOffset: Dispatch<SetStateAction<number>>;
  category: string;
  setCategory: (value: string) => void;
  actor: string;
  setActor: (value: string) => void;
  stats: AuditStats | null;
  success: string;
  setSuccess: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  clearFilters: () => void;
  logsError: string | null;
  logsLoading: boolean;
  logs: AuditLog[];
  offset: number;
  expandedId: number | null;
  setExpandedId: Dispatch<SetStateAction<number | null>>;
  total: number;
  pageStart: number;
  pageEnd: number;
}) {
  return (
    <>
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Raw logs
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Full trail of database writes, including request and response
              bodies. Passwords are redacted.
            </p>
          </div>

          <form
            className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchApplied(search.trim());
              setOffset(0);
            }}
          >
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Summary, path, user, action"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={fieldClass}
              >
                <option value="">All</option>
                {AUDIT_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {categoryLabel(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">User</span>
              <select
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className={fieldClass}
              >
                <option value="">Anyone</option>
                {(stats?.users || []).map((row) => (
                  <option key={row.username} value={row.username}>
                    {row.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Result</span>
              <select
                value={success}
                onChange={(e) => setSuccess(e.target.value)}
                className={fieldClass}
              >
                <option value="">All</option>
                <option value="true">Succeeded</option>
                <option value="false">Failed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="sm:col-span-2 xl:col-span-6 flex flex-wrap gap-2">
              <button
                type="submit"
                className="min-h-11 px-4 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-11 px-4 py-2 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </form>

          {logsError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700"
            >
              {logsError}
            </div>
          )}

          <RefreshBar active={logsLoading && logs.length > 0} />
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {logsLoading && logs.length === 0 ? (
              <div className="p-4">
                <PageSkeleton variant="table" label="Loading logs" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-700 mb-1">
                  No writes recorded
                </h3>
                <p className="text-sm text-slate-600">
                  Saves from this app will appear here. If you expected history,
                  confirm <span className="font-mono">setup/audit-logs.sql</span>{" "}
                  has been run.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                        When
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">
                        Who
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">
                        What
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">
                        Result
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const open = expandedId === log.id;
                      return (
                        <LogRow
                          key={log.id}
                          log={log}
                          open={open}
                          onToggle={() =>
                            setExpandedId(open ? null : log.id)
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <p>
                {pageStart}–{pageEnd} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={offset === 0 || logsLoading}
                  onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                  className="min-h-11 px-4 py-2 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={offset + PAGE_SIZE >= total || logsLoading}
                  onClick={() => setOffset((value) => value + PAGE_SIZE)}
                  className="min-h-11 px-4 py-2 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

    </>
  );
}
