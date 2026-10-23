"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isSuperuser } from "@/lib/AuthContext";
import { AUDIT_CATEGORIES, categoryLabel } from "@/lib/auditLabels";
import SiteHeader from "@/components/site-header";
import { IconRefresh } from "@/components/icons";

interface AuditLog {
  id: number;
  created_at: string;
  actor_id: number | null;
  actor_username: string | null;
  actor_role: string | null;
  category: string;
  action: string;
  summary: string;
  method: string | null;
  path: string | null;
  status_code: number | null;
  success: boolean;
  ip: string | null;
  user_agent: string | null;
  request_body: unknown;
  response_body: unknown;
}

interface AuditStats {
  days: number;
  sampled: number;
  capped: boolean;
  total: number;
  failed: number;
  uniqueUsers: number;
  byCategory: Record<string, number>;
  users: { username: string; total: number; failed: number }[];
  daysSeries: { date: string; count: number }[];
}

const PAGE_SIZE = 50;
const STATS_DAYS = 30;

const fieldClass =
  "w-full min-h-11 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-600";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function prettyJson(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function categoryChipClass(category: string): string {
  switch (category) {
    case "attendance":
      return "bg-emerald-50 text-emerald-800";
    case "gate_sheet":
      return "bg-sky-50 text-sky-800";
    case "tie_duties":
      return "bg-amber-50 text-amber-800";
    case "suspensions":
      return "bg-violet-50 text-violet-800";
    case "excuses":
      return "bg-sky-50 text-sky-800";
    case "users":
      return "bg-slate-800 text-white";
    case "devices":
      return "bg-amber-50 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fillDaySeries(
  series: { date: string; count: number }[],
  days: number
): { date: string; count: number }[] {
  const byDate = new Map(series.map((row) => [row.date, row.count]));
  const out: { date: string; count: number }[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function LogsPage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const allowed = isSuperuser(user);

  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [actor, setActor] = useState("");
  const [success, setSuccess] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authenticated) {
      router.push("/login");
      return;
    }
    if (!allowed) {
      router.push("/");
    }
  }, [authenticated, allowed, router]);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchApplied(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [category, actor, success, fromDate, toDate, searchApplied]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`/api/audit/stats?days=${STATS_DAYS}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load analytics");
      }
      setStats(data as AuditStats);
    } catch (err) {
      setStats(null);
      setStatsError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (category) params.set("category", category);
      if (actor) params.set("actor", actor);
      if (success) params.set("success", success);
      if (searchApplied) params.set("q", searchApplied);
      if (fromDate) {
        params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      }
      if (toDate) {
        params.set("to", new Date(`${toDate}T23:59:59.999`).toISOString());
      }
      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load logs");
      }
      setLogs((data.logs || []) as AuditLog[]);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      setLogs([]);
      setTotal(0);
      setLogsError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [offset, category, actor, success, fromDate, toDate, searchApplied]);

  useEffect(() => {
    if (!authenticated || !allowed) return;
    void loadStats();
  }, [authenticated, allowed, loadStats]);

  useEffect(() => {
    if (!authenticated || !allowed) return;
    void loadLogs();
  }, [authenticated, allowed, loadLogs]);

  const daySeries = useMemo(
    () => fillDaySeries(stats?.daysSeries || [], STATS_DAYS),
    [stats]
  );
  const maxDayCount = Math.max(1, ...daySeries.map((row) => row.count));
  const categoryRows = useMemo(() => {
    const counts = stats?.byCategory || {};
    return AUDIT_CATEGORIES.map((key) => ({
      key,
      label: categoryLabel(key),
      count: counts[key] || 0,
    })).filter((row) => row.count > 0);
  }, [stats]);
  const maxCategoryCount = Math.max(1, ...categoryRows.map((row) => row.count));
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  const clearFilters = () => {
    setCategory("");
    setActor("");
    setSuccess("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setSearchApplied("");
  };

  const refresh = () => {
    void loadStats();
    void loadLogs();
  };

  if (!authenticated || !allowed) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Logs"
        subtitle="Who wrote what, and the raw request behind it"
        backTo="/"
        maxWidth="7xl"
        actions={
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            <IconRefresh className="w-3 h-3 mr-1" />
            Refresh
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Activity
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Every attendance save, gate-sheet change, tie-duty assignment, and
            other database write made through this app. Fingerprint device scans
            themselves are not recorded here.
          </p>
        </div>

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
            label="Writes (30 days)"
            value={statsLoading ? "…" : String(stats?.total ?? 0)}
            hint={
              stats?.capped
                ? `Sampled first ${stats.sampled.toLocaleString()} rows`
                : "All writes in the window"
            }
          />
          <StatCard
            label="Failed writes"
            value={statsLoading ? "…" : String(stats?.failed ?? 0)}
            hint="Upstream errors and rejected saves"
            tone={stats && stats.failed > 0 ? "warn" : "plain"}
          />
          <StatCard
            label="People writing"
            value={statsLoading ? "…" : String(stats?.uniqueUsers ?? 0)}
            hint="Distinct signed-in accounts"
          />
          <StatCard
            label="Most active"
            value={
              statsLoading
                ? "…"
                : stats?.users[0]?.username || "—"
            }
            hint={
              stats?.users[0]
                ? `${stats.users[0].total} write${stats.users[0].total === 1 ? "" : "s"}`
                : "No activity yet"
            }
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Writes by day
            </h3>
            <p className="text-xs text-slate-600 mb-4">Last {STATS_DAYS} days</p>
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
              Signed-in accounts that wrote through the app in the last{" "}
              {STATS_DAYS} days
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
                        {row.total}
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

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {logsLoading ? (
              <p className="p-8 text-center text-sm text-slate-600">
                Loading logs…
              </p>
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
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "warn";
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          tone === "warn" ? "text-red-800" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-600">{hint}</p>
    </div>
  );
}

function LogRow({
  log,
  open,
  onToggle,
}: {
  log: AuditLog;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={open ? "bg-slate-50/80" : "hover:bg-slate-50/50"}>
        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
          {formatWhen(log.created_at)}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">
            {log.actor_username || "(unknown)"}
          </p>
          <p className="text-xs text-slate-600">{log.actor_role || "—"}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-slate-900">{log.summary}</p>
          <p className="text-xs font-mono text-slate-600 truncate max-w-[28rem]">
            {log.method} {log.path}
          </p>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${categoryChipClass(log.category)}`}
          >
            {categoryLabel(log.category)}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              log.success
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {log.success ? `OK ${log.status_code ?? ""}`.trim() : `Failed ${log.status_code ?? ""}`.trim()}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="min-h-11 px-3 py-1.5 rounded-md text-sm font-medium text-brand-800 hover:bg-brand-50"
          >
            {open ? "Hide" : "Raw"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
              <div>
                <dt className="text-xs font-medium text-slate-600">Action</dt>
                <dd className="font-mono text-slate-800 break-all">{log.action}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Path</dt>
                <dd className="font-mono text-slate-800 break-all">
                  {log.method} {log.path || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">IP</dt>
                <dd className="font-mono text-slate-800">{log.ip || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">User agent</dt>
                <dd className="text-slate-800 break-all">{log.user_agent || "—"}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">
                  Request body
                </p>
                <pre className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md p-3 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {prettyJson(log.request_body)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">
                  Response body
                </p>
                <pre className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md p-3 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {prettyJson(log.response_body)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
