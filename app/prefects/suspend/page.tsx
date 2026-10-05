"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import Modal from "@/components/Modal";
import { IconRefresh, IconClose } from "@/components/icons";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
}

interface Suspension {
  id: number;
  prefectId: number;
  startDate: string;
  /** Inclusive; null = ongoing. */
  endDate: string | null;
  reason: string | null;
}

type Status = "active" | "suspended" | "scheduled";
type Filter = "all" | Status;
type Tab = "prefects" | "past";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/** "2026-10-05" → "Oct 5, 2026" */
function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRange(s: Suspension): string {
  return s.endDate
    ? `${formatDate(s.startDate)} – ${formatDate(s.endDate)}`
    : `From ${formatDate(s.startDate)} (ongoing)`;
}

function isActiveOn(s: Suspension, date: string): boolean {
  return s.startDate <= date && (s.endDate === null || s.endDate >= date);
}

/** Inclusive day count between two 'YYYY-MM-DD' dates. */
function durationDays(start: string, end: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function SuspendPrefectsPage() {
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("prefects");

  // Past suspensions filters
  const [pastName, setPastName] = useState("");
  const [pastCode, setPastCode] = useState("");
  const [minDays, setMinDays] = useState("");
  const [maxDays, setMaxDays] = useState("");

  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Manage modal
  const [managing, setManaging] = useState<Prefect | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(apiUrl("/api/prefects")),
        fetch(apiUrl("/api/suspensions")),
      ]);
      const pData = await readApiJson<{ prefects?: Prefect[]; error?: string }>(pRes);
      if (!pRes.ok) throw new Error(pData.error || "Failed to load prefects");
      const sData = await readApiJson<{
        today?: string;
        suspensions?: Suspension[];
        error?: string;
      }>(sRes);
      if (!sRes.ok) throw new Error(sData.error || "Failed to load suspensions");
      setPrefects(pData.prefects || []);
      setSuspensions(sData.suspensions || []);
      setToday(sData.today || "");
    } catch (err) {
      setFeedback({
        msg: err instanceof Error ? err.message : "Failed to load suspensions",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const suspensionsByPrefect = useMemo(() => {
    const map = new Map<number, Suspension[]>();
    for (const s of suspensions) {
      const list = map.get(s.prefectId) || [];
      list.push(s);
      map.set(s.prefectId, list);
    }
    return map;
  }, [suspensions]);

  const statusOf = useCallback(
    (prefectId: number): { status: Status; current: Suspension | null } => {
      const list = suspensionsByPrefect.get(prefectId) || [];
      const current = list.find((s) => isActiveOn(s, today));
      if (current) return { status: "suspended", current };
      const upcoming = list
        .filter((s) => s.startDate > today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      if (upcoming) return { status: "scheduled", current: upcoming };
      return { status: "active", current: null };
    },
    [suspensionsByPrefect, today]
  );

  const counts = useMemo(() => {
    const c = { suspended: 0, scheduled: 0 };
    for (const p of prefects) {
      const { status } = statusOf(p.id);
      if (status !== "active") c[status]++;
    }
    return c;
  }, [prefects, statusOf]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prefects.filter((p) => {
      if (filter !== "all" && statusOf(p.id).status !== filter) return false;
      if (!q) return true;
      return [p.name, p.class, p.code, p.pin].some((v) =>
        v?.toLowerCase().includes(q)
      );
    });
  }, [prefects, query, filter, statusOf]);

  const pastRows = useMemo(() => {
    const prefectById = new Map(prefects.map((p) => [p.id, p]));
    const name = pastName.trim().toLowerCase();
    const code = pastCode.trim().toLowerCase();
    const min = minDays ? Number(minDays) : null;
    const max = maxDays ? Number(maxDays) : null;

    return suspensions
      .filter((s): s is Suspension & { endDate: string } => s.endDate !== null && s.endDate < today)
      .map((s) => ({
        suspension: s,
        prefect: prefectById.get(s.prefectId) ?? null,
        days: durationDays(s.startDate, s.endDate),
      }))
      .filter(({ prefect, days }) => {
        if (name && !prefect?.name.toLowerCase().includes(name)) return false;
        if (code && !prefect?.code?.toLowerCase().includes(code)) return false;
        if (min !== null && days < min) return false;
        if (max !== null && days > max) return false;
        return true;
      })
      .sort((a, b) => b.suspension.endDate.localeCompare(a.suspension.endDate));
  }, [suspensions, prefects, today, pastName, pastCode, minDays, maxDays]);

  const pastTotal = suspensions.filter((s) => s.endDate !== null && s.endDate < today).length;
  const pastFiltersActive = !!(pastName || pastCode || minDays || maxDays);

  // -------------------------------------------------------
  // Manage modal
  // -------------------------------------------------------

  function resetForm() {
    setEditingId(null);
    setFormStart(today);
    setFormEnd("");
    setFormReason("");
    setFormError(null);
  }

  function openManage(prefect: Prefect) {
    setManaging(prefect);
    resetForm();
  }

  function startEdit(s: Suspension) {
    setEditingId(s.id);
    setFormStart(s.startDate);
    setFormEnd(s.endDate || "");
    setFormReason(s.reason || "");
    setFormError(null);
  }

  async function saveSuspension(
    body: { startDate: string; endDate: string | null; reason: string | null },
    id: number | null
  ) {
    if (!managing) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(
        apiUrl(id ? `/api/suspensions/${id}` : `/api/prefects/${managing.id}/suspensions`),
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to save suspension");
      setFeedback({ msg: `Suspension saved for ${managing.name}.`, ok: true });
      resetForm();
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveSuspension(
      {
        startDate: formStart,
        endDate: formEnd || null,
        reason: formReason.trim() || null,
      },
      editingId
    );
  }

  function handleEndToday(s: Suspension) {
    if (!window.confirm(`End this suspension today (${formatDate(today)})? Today still counts as suspended.`)) {
      return;
    }
    saveSuspension({ startDate: s.startDate, endDate: today, reason: s.reason }, s.id);
  }

  async function handleDelete(s: Suspension) {
    if (
      !window.confirm(
        `Delete the suspension ${formatRange(s)}? Sign-ins in that period will no longer use the earlier deadline.`
      )
    ) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(apiUrl(`/api/suspensions/${s.id}`), { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to delete suspension");
      if (editingId === s.id) resetForm();
      await fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const managedHistory = managing ? suspensionsByPrefect.get(managing.id) || [] : [];

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Suspend House Prefects"
        subtitle="Suspended prefects must sign in 15 minutes before their usual deadline"
        backTo="/prefects"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {feedback && (
          <div className={`mb-4 p-3 rounded-md text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-2 font-bold" aria-label="Dismiss">
              <IconClose className="w-3 h-3" />
            </button>
          </div>
        )}

        {!canWrite && (
          <div className="mb-4 p-3 rounded-md text-sm bg-amber-50 text-amber-700 border border-amber-200">
            You can view suspensions, but only admins can add or change them.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "prefects", label: "Prefects" },
            { id: "past", label: `Past suspensions${pastTotal ? ` (${pastTotal})` : ""}` },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "prefects" && (
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

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {visible.length} Prefect{visible.length !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => { setLoading(true); fetchAll(); }}
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
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-800">{p.name}</span>
                            </div>
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
                              <p className="text-[11px] text-slate-500 mt-1">{formatRange(current)}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {(canWrite || historyCount > 0) && (
                              <button
                                onClick={() => openManage(p)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
        )}

        {tab === "past" && (
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
        )}
      </main>

      <Modal
        isOpen={managing !== null}
        onClose={() => !saving && setManaging(null)}
        title={managing ? `Suspensions — ${managing.name}` : "Suspensions"}
        size="lg"
      >
        <div className="space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* History */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">History</h3>
            {managedHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No suspensions recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {managedHistory.map((s) => (
                  <li
                    key={s.id}
                    className={`px-3 py-2.5 flex items-start justify-between gap-3 ${editingId === s.id ? "bg-brand-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        {formatRange(s)}
                        {isActiveOn(s, today) && (
                          <span className="ml-2 text-[11px] font-medium text-violet-700">Current</span>
                        )}
                      </p>
                      {s.reason && (
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{s.reason}</p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.endDate === null && isActiveOn(s, today) && (
                          <button
                            type="button"
                            onClick={() => handleEndToday(s)}
                            disabled={saving}
                            className="px-2 py-1 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            End today
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          disabled={saving}
                          className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={saving}
                          className="px-2 py-1 rounded-md text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Delete suspension"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add / edit form */}
          {canWrite && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-700">
                {editingId ? "Edit suspension" : "New suspension"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Start date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    End date <span className="text-slate-400 font-normal">(blank = ongoing)</span>
                  </label>
                  <input
                    type="date"
                    value={formEnd}
                    min={formStart || undefined}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-slate-500">
                Both dates are inclusive. Morning sign-ins on these dates must be 15 minutes
                earlier than usual.
              </p>
              <div className="flex items-center justify-between">
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel edit
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={saving || !formStart}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add suspension"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
