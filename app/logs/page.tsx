"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isSuperuser } from "@/lib/AuthContext";
import { AUDIT_CATEGORIES, categoryLabel } from "@/lib/auditLabels";
import SiteHeader from "@/components/site-header";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ActivityOverview } from "./ActivityOverview";
import { fillDaySeries } from "./format";
import { RawLogs } from "./RawLogs";
import { SignInSummaryTable } from "./SignInSummaryTable";
import type { AuditLog, AuditStats, SignInSummary } from "./types";

const PAGE_SIZE = 50;
const STATS_DAYS = 30;

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

  const [signIns, setSignIns] = useState<SignInSummary[]>([]);
  const [signInsCapped, setSignInsCapped] = useState(false);
  const [signInsLoading, setSignInsLoading] = useState(true);
  const [signInsError, setSignInsError] = useState<string | null>(null);

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

  const loadSignIns = useCallback(async () => {
    setSignInsLoading(true);
    setSignInsError(null);
    try {
      const res = await fetch("/api/audit/logins");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load sign-ins");
      }
      setSignIns((data.logins || []) as SignInSummary[]);
      setSignInsCapped(Boolean(data.capped));
    } catch (err) {
      setSignIns([]);
      setSignInsError(err instanceof Error ? err.message : "Failed to load sign-ins");
    } finally {
      setSignInsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated || !allowed) return;
    void loadSignIns();
  }, [authenticated, allowed, loadSignIns]);

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
    void loadSignIns();
  };

  if (!authenticated || !allowed) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Logs"
        subtitle="Who signed in, who wrote what, and the raw request behind it"
        backTo="/"
        maxWidth="7xl"
        actions={
<RefreshButton onClick={refresh} />
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Activity
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Sign-ins, attendance saves, gate-sheet changes, tie-duty
            assignments, and other database writes made through this app.
            Fingerprint device scans themselves are not recorded here.
          </p>
        </div>

        <ActivityOverview
          statsError={statsError}
          statsLoading={statsLoading}
          stats={stats}
          daySeries={daySeries}
          maxDayCount={maxDayCount}
          categoryRows={categoryRows}
          maxCategoryCount={maxCategoryCount}
        />

        <RawLogs
          search={search}
          setSearch={setSearch}
          setSearchApplied={setSearchApplied}
          setOffset={setOffset}
          category={category}
          setCategory={setCategory}
          actor={actor}
          setActor={setActor}
          stats={stats}
          success={success}
          setSuccess={setSuccess}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          clearFilters={clearFilters}
          logsError={logsError}
          logsLoading={logsLoading}
          logs={logs}
          offset={offset}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
        />

        <SignInSummaryTable
          signInsCapped={signInsCapped}
          signInsError={signInsError}
          signInsLoading={signInsLoading}
          signIns={signIns}
        />

      </main>
    </div>
  );
}

