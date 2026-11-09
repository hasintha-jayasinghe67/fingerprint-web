"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { IconCheck } from "@/components/icons";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code?: string | null;
  pin?: string | null;
}

type ExcuseType = "es" | "eg" | "both";

interface LeaveExcuse {
  id: number;
  excuseType: ExcuseType;
  startDate: string;
  endDate: string;
  reason: string | null;
  prefects: Prefect[];
}

type Tab = "log" | "compose";

function buildEmail(opts: {
  fromTime: string;
  toTime: string;
  date: string;
  reason: string;
  prefects: Prefect[];
}): string {
  const { fromTime, toTime, date, reason, prefects } = opts;
  const lines = prefects.map((p, i) => {
    const classPart = p.class?.trim() ? ` - ${p.class.trim()}` : "";
    return `${i + 1}. ${p.name}${classPart}`;
  });

  return [
    "Good Morning Miss,",
    "",
    `Please be kind enough to grant leave for the following House Prefects from ${fromTime} to ${toTime} on ${date}, as they have duty at ${reason}:`,
    "",
    ...lines,
    "",
    "Thank you.",
  ].join("\n");
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function excuseTypeLabel(type: ExcuseType): string {
  if (type === "es") return "ES";
  if (type === "eg") return "EG";
  return "ES + EG";
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm ";

export default function ExcusesPage() {
  const [tab, setTab] = useState<Tab>("log");
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [excuses, setExcuses] = useState<LeaveExcuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [excuseType, setExcuseType] = useState<ExcuseType>("both");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Compose tab state
  const [composeSelected, setComposeSelected] = useState<Set<number>>(new Set());
  const [fromTime, setFromTime] = useState("12.10 p.m.");
  const [toTime, setToTime] = useState("1.30 p.m.");
  const [composeDate, setComposeDate] = useState("");
  const [composeReason, setComposeReason] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchPrefects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl("/api/prefects"));
      const data = await readApiJson<{ prefects?: Prefect[]; error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error(data.error || "Failed to load prefects");
      }
      const list = [...(data.prefects || [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setPrefects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExcuses = useCallback(async () => {
    try {
      setListLoading(true);
      const res = await fetch(apiUrl("/api/leave-excuses"));
      const data = await readApiJson<{
        excuses?: LeaveExcuse[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to load leave excuses");
      }
      setExcuses(data.excuses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefects();
    fetchExcuses();
  }, [fetchPrefects, fetchExcuses]);

  const selectedPrefects = useMemo(
    () => prefects.filter((p) => selected.has(p.id)),
    [prefects, selected]
  );

  const composeSelectedPrefects = useMemo(
    () => prefects.filter((p) => composeSelected.has(p.id)),
    [prefects, composeSelected]
  );

  const emailText = useMemo(
    () =>
      buildEmail({
        fromTime: fromTime.trim() || "…",
        toTime: toTime.trim() || "…",
        date: composeDate.trim() || "…",
        reason: composeReason.trim() || "…",
        prefects: composeSelectedPrefects,
      }),
    [fromTime, toTime, composeDate, composeReason, composeSelectedPrefects]
  );

  function togglePrefect(id: number, target: "log" | "compose") {
    const setter = target === "log" ? setSelected : setComposeSelected;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (target === "compose") setCopied(false);
  }

  function selectAll(target: "log" | "compose") {
    const ids = new Set(prefects.map((p) => p.id));
    if (target === "log") setSelected(ids);
    else {
      setComposeSelected(ids);
      setCopied(false);
    }
  }

  function clearSelection(target: "log" | "compose") {
    if (target === "log") setSelected(new Set());
    else {
      setComposeSelected(new Set());
      setCopied(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setExcuseType("both");
    setStartDate("");
    setEndDate("");
    setReason("");
    setSelected(new Set());
  }

  function startEdit(excuse: LeaveExcuse) {
    setTab("log");
    setEditingId(excuse.id);
    setExcuseType(excuse.excuseType);
    setStartDate(excuse.startDate);
    setEndDate(excuse.endDate);
    setReason(excuse.reason || "");
    setSelected(new Set(excuse.prefects.map((p) => p.id)));
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (selectedPrefects.length === 0) {
      setError("Select at least one house prefect.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Choose a from date and to date.");
      return;
    }
    if (endDate < startDate) {
      setError("To date must be on or after from date.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const body = {
        excuseType,
        startDate,
        endDate,
        reason: reason.trim() || null,
        prefectIds: [...selected],
      };
      const res = await fetch(
        apiUrl(
          editingId
            ? `/api/leave-excuses/${editingId}`
            : "/api/leave-excuses"
        ),
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await readApiJson<{ error?: string; excuse?: LeaveExcuse }>(
        res
      );
      if (!res.ok) {
        throw new Error(data.error || "Failed to save leave excuse");
      }
      setNotice(
        editingId
          ? "Leave excuse updated. ES/EG updated on saved gate days in range."
          : "Leave excuse logged. ES/EG applied on saved gate days in range."
      );
      resetForm();
      await fetchExcuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this leave excuse?")) return;
    try {
      setDeletingId(id);
      setError(null);
      setNotice(null);
      const res = await fetch(apiUrl(`/api/leave-excuses/${id}`), {
        method: "DELETE",
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete leave excuse");
      }
      if (editingId === id) resetForm();
      setNotice("Leave excuse deleted.");
      await fetchExcuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy() {
    if (composeSelectedPrefects.length === 0) return;
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  function renderPrefectChecklist(
    target: "log" | "compose",
    selection: Set<number>
  ) {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (prefects.length === 0) {
      return (
        <div className="px-6 py-10 text-sm text-slate-500 text-center">
          No prefects registered yet.{" "}
          <Link
            href="/prefects/add"
            className="text-brand-700 font-medium hover:underline"
          >
            Add house prefects
          </Link>{" "}
          first.
        </div>
      );
    }
    return (
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {prefects.map((p) => (
          <label
            key={p.id}
            className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selection.has(p.id)}
              onChange={() => togglePrefect(p.id, target)}
              className="mt-0.5 rounded border-slate-300 text-brand-800"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">
                {p.name}
              </span>
              <span className="block text-xs text-slate-500">
                {p.class || "No class"}
              </span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Leave Excuses"
        subtitle="Log email leave excuses or compose leave emails"
        backTo="/"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex gap-1 p-1 rounded-lg bg-slate-100 w-fit">
          <button
            type="button"
            onClick={() => setTab("log")}
            className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "log"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Log excuse
          </button>
          <button
            type="button"
            onClick={() => setTab("compose")}
            className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "compose"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Compose email
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="p-3 rounded-md text-sm bg-emerald-50 text-emerald-800 border border-emerald-200"
          >
            {notice}
          </div>
        )}

        {tab === "log" ? (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {editingId ? "Edit leave excuse" : "Log leave excuse"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Choose ES, EG, or both, a date range, and the prefects.
                    Saved gate days in the range update automatically.
                  </p>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">
                    Excuse type
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["es", "ES"],
                        ["eg", "EG"],
                        ["both", "ES + EG"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setExcuseType(value)}
                        className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          excuseType === value
                            ? "bg-brand-700 text-white border-brand-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    From date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value && endDate < e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    To date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="leaveReason"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Reason (optional)
                  </label>
                  <input
                    id="leaveReason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Inter-House College History Quiz finals"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    House prefects
                    {!loading && (
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({selected.size} selected)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Who this leave excuse covers.
                  </p>
                </div>
                {!loading && prefects.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll("log")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSelection("log")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {renderPrefectChecklist("log", selected)}
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || selected.size === 0 || !startDate || !endDate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Update leave excuse"
                      : "Log leave excuse"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Logged excuses</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Auto-applied to ES/EG on saved gate attendance days.
                </p>
              </div>
              {listLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : excuses.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500 text-center">
                  No leave excuses logged yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {excuses.map((excuse) => (
                    <li key={excuse.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                              {excuseTypeLabel(excuse.excuseType)}
                            </span>
                            <span className="text-sm font-medium text-slate-800">
                              {formatDateShort(excuse.startDate)}
                              {excuse.endDate !== excuse.startDate
                                ? ` – ${formatDateShort(excuse.endDate)}`
                                : ""}
                            </span>
                          </div>
                          {excuse.reason && (
                            <p className="text-sm text-slate-600">
                              {excuse.reason}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {excuse.prefects.length} prefect
                            {excuse.prefects.length === 1 ? "" : "s"}
                            {excuse.prefects.length > 0
                              ? `: ${excuse.prefects
                                  .slice(0, 6)
                                  .map((p) => p.name)
                                  .join(", ")}${
                                  excuse.prefects.length > 6 ? "…" : ""
                                }`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(excuse)}
                            className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(excuse.id)}
                            disabled={deletingId === excuse.id}
                            className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === excuse.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Leave details</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Fill in the times, date, and duty reason for the email.
                </p>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fromTime"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    From
                  </label>
                  <input
                    id="fromTime"
                    type="text"
                    value={fromTime}
                    onChange={(e) => {
                      setFromTime(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="12.10 p.m."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="toTime"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    To
                  </label>
                  <input
                    id="toTime"
                    type="text"
                    value={toTime}
                    onChange={(e) => {
                      setToTime(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="1.30 p.m."
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="leaveDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="leaveDate"
                    type="text"
                    value={composeDate}
                    onChange={(e) => {
                      setComposeDate(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="July 13th"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="reason"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Duty reason
                  </label>
                  <input
                    id="reason"
                    type="text"
                    value={composeReason}
                    onChange={(e) => {
                      setComposeReason(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="the finals’ competition for the Inter-House College History Quiz"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Appears after “as they have duty at …”
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    House prefects
                    {!loading && (
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({composeSelected.size} selected)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Select who should appear in the leave email.
                  </p>
                </div>
                {!loading && prefects.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll("compose")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSelection("compose")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {renderPrefectChecklist("compose", composeSelected)}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">Email preview</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Updates as you edit details and selection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={composeSelectedPrefects.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {copied ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    "Copy email"
                  )}
                </button>
              </div>
              <pre className="px-6 py-5 text-sm font-mono text-slate-800 whitespace-pre-wrap break-words leading-relaxed bg-slate-50/50">
                {composeSelectedPrefects.length === 0
                  ? "Select at least one house prefect to generate the email."
                  : emailText}
              </pre>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
