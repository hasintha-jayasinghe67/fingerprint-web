"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import HeaderMenu, { headerMenuItemClass } from "@/components/HeaderMenu";
import { IconCheck, IconSettings } from "@/components/icons";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
}

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

export default function ExcusesPage() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [fromTime, setFromTime] = useState("12.10 p.m.");
  const [toTime, setToTime] = useState("1.30 p.m.");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

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

  useEffect(() => {
    fetchPrefects();
  }, [fetchPrefects]);

  const selectedPrefects = useMemo(
    () => prefects.filter((p) => selected.has(p.id)),
    [prefects, selected]
  );

  const emailText = useMemo(
    () =>
      buildEmail({
        fromTime: fromTime.trim() || "…",
        toTime: toTime.trim() || "…",
        date: date.trim() || "…",
        reason: reason.trim() || "…",
        prefects: selectedPrefects,
      }),
    [fromTime, toTime, date, reason, selectedPrefects]
  );

  function togglePrefect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCopied(false);
  }

  function selectAll() {
    setSelected(new Set(prefects.map((p) => p.id)));
    setCopied(false);
  }

  function clearSelection() {
    setSelected(new Set());
    setCopied(false);
  }

  async function handleCopy() {
    if (selectedPrefects.length === 0) return;
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Leave Excuses"
        subtitle="Generate leave emails for house prefects"
        backTo="/"
        maxWidth="5xl"
        actions={
          <HeaderMenu label="Navigate">
            <Link href="/attendance" role="menuitem" className={headerMenuItemClass}>
              Attendance
            </Link>
            <Link href="/prefects" role="menuitem" className={headerMenuItemClass}>
              Prefects
            </Link>
            <Link href="/batches" role="menuitem" className={headerMenuItemClass}>
              Batches
            </Link>
            <Link href="/gate-sheet" role="menuitem" className={headerMenuItemClass}>
              Gate Sheet
            </Link>
            <Link href="/excuses" role="menuitem" className={headerMenuItemClass}>
              Excuses
            </Link>
            <Link href="/settings" role="menuitem" className={headerMenuItemClass}>
              <IconSettings className="w-3 h-3" />
              Settings
            </Link>
          </HeaderMenu>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

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
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
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
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
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
                    ({selected.size} selected)
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
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : prefects.length === 0 ? (
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
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {prefects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => togglePrefect(p.id)}
                    className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
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
          )}
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
              disabled={selectedPrefects.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            {selectedPrefects.length === 0
              ? "Select at least one house prefect to generate the email."
              : emailText}
          </pre>
        </div>
      </main>
    </div>
  );
}
