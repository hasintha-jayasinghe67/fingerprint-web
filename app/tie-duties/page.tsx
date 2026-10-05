"use client";

import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { IconRefresh, IconClose, IconCheck } from "@/components/icons";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface Batch {
  id: number;
  name: string;
  memberCount: number;
}

interface TieDutyMember {
  prefectId: number | null;
  name: string;
  pin: string;
  code: string | null;
  class: string | null;
  batchName: string | null;
  /** Included automatically because they were suspended on the duty date. */
  wasSuspended?: boolean;
}

interface TieDuty {
  id: number;
  /** 'YYYY-MM-DD' */
  dutyDate: string;
  prefectCount: number;
  batchNames: string[];
  createdAt: string;
  members: TieDutyMember[];
}

type Tab = "history" | "assign";

/** An unsaved random draw awaiting confirmation. */
interface Draft {
  /** Suspended prefects (always included) plus the random picks. */
  members: TieDutyMember[];
  /** Everyone randomly drawn so far this round; Reassign never picks them again. */
  drawnIds: number[];
  /** Places filled at random (count minus suspended prefects). */
  randomCount: number;
  /** Eligible prefects left for another Reassign. */
  remaining: number;
  attempt: number;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/** Today's date in Sri Lanka as 'YYYY-MM-DD'. */
function todaySriLankan(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

/** "2026-10-05" → "Monday, October 5, 2026" */
function formatDutyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function sortDuties(list: TieDuty[]): TieDuty[] {
  return [...list].sort(
    (a, b) =>
      b.dutyDate.localeCompare(a.dutyDate) || b.createdAt.localeCompare(a.createdAt)
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function TieDutiesPage() {
  const [tab, setTab] = useState<Tab>("history");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [duties, setDuties] = useState<TieDuty[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Assign form
  const [dutyDate, setDutyDate] = useState(todaySriLankan);
  const [count, setCount] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<TieDuty | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(apiUrl("/api/batches")),
        fetch(apiUrl("/api/tie-duties")),
      ]);
      const bData = await readApiJson<{ batches?: Batch[]; error?: string }>(bRes);
      if (!bRes.ok) throw new Error(bData.error || "Failed to load batches");
      const tData = await readApiJson<{ tieDuties?: TieDuty[]; error?: string }>(tRes);
      if (!tRes.ok) throw new Error(tData.error || "Failed to load tie duties");
      setBatches(bData.batches || []);
      setDuties(tData.tieDuties || []);
    } catch (err) {
      setFeedback({
        msg: err instanceof Error ? err.message : "Failed to load tie duties",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const poolSize = useMemo(
    () =>
      batches
        .filter((b) => selectedBatchIds.has(b.id))
        .reduce((sum, b) => sum + b.memberCount, 0),
    [batches, selectedBatchIds]
  );

  const countNum = Number(count);
  const countValid = Number.isInteger(countNum) && countNum >= 1;

  function toggleBatch(id: number) {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllBatches() {
    setSelectedBatchIds((prev) =>
      prev.size === batches.length ? new Set() : new Set(batches.map((b) => b.id))
    );
  }

  // -------------------------------------------------------
  // Assign
  // -------------------------------------------------------

  async function draw(excludePrefectIds: number[]) {
    const res = await fetch(apiUrl("/api/tie-duties/draw"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dutyDate,
        count: countNum,
        batchIds: [...selectedBatchIds],
        excludePrefectIds,
      }),
    });
    const data = await readApiJson<{
      members?: TieDutyMember[];
      randomCount?: number;
      remaining?: number;
      error?: string;
    }>(res);
    if (!res.ok || !data.members) throw new Error(data.error || "Failed to select prefects");
    return {
      members: data.members,
      randomIds: data.members.filter((m) => !m.wasSuspended).map((m) => m.prefectId!),
      randomCount: data.randomCount ?? 0,
      remaining: data.remaining ?? 0,
    };
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setAssignError(null);
    setLastResult(null);
    try {
      const { members, randomIds, randomCount, remaining } = await draw([]);
      setDraft({ members, drawnIds: randomIds, randomCount, remaining, attempt: 1 });
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleReassign() {
    if (!draft) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const { members, randomIds, randomCount, remaining } = await draw(draft.drawnIds);
      setDraft({
        members,
        drawnIds: [...draft.drawnIds, ...randomIds],
        randomCount,
        remaining,
        attempt: draft.attempt + 1,
      });
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setSaving(true);
    setAssignError(null);
    try {
      const res = await fetch(apiUrl("/api/tie-duties"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dutyDate,
          count: countNum,
          batchIds: [...selectedBatchIds],
          prefectIds: draft.members.map((m) => m.prefectId),
        }),
      });
      const data = await readApiJson<{ tieDuty?: TieDuty; error?: string }>(res);
      if (!res.ok || !data.tieDuty) throw new Error(data.error || "Failed to save tie duty");
      setLastResult(data.tieDuty);
      setDuties((prev) => sortDuties([data.tieDuty!, ...prev]));
      setDraft(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelDraft() {
    setDraft(null);
    setAssignError(null);
  }

  // -------------------------------------------------------
  // Delete
  // -------------------------------------------------------

  async function handleDelete(duty: TieDuty) {
    if (!window.confirm(`Delete the tie duty for ${formatDutyDate(duty.dutyDate)}?`)) {
      return;
    }
    setDeletingId(duty.id);
    try {
      const res = await fetch(apiUrl(`/api/tie-duties/${duty.id}`), { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to delete tie duty");
      setDuties((prev) => prev.filter((d) => d.id !== duty.id));
      if (lastResult?.id === duty.id) setLastResult(null);
    } catch (err) {
      setFeedback({ msg: err instanceof Error ? err.message : "Unknown error", ok: false });
    } finally {
      setDeletingId(null);
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Tie Duties"
        subtitle="Randomly assign house prefects to tie duty"
        backTo="/"
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "history", label: `Past tie duties${duties.length ? ` (${duties.length})` : ""}` },
            { id: "assign", label: "Assign duty" },
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

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ================= Past tie duties ================= */}
        {!loading && tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {duties.length} Tie dut{duties.length === 1 ? "y" : "ies"}
              </h2>
              <button
                onClick={() => { setLoading(true); fetchAll(); }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <IconRefresh className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {duties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No tie duties assigned yet</p>
                <button
                  type="button"
                  onClick={() => setTab("assign")}
                  className="mt-4 px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  Assign a tie duty
                </button>
              </div>
            ) : (
              duties.map((duty) => (
                <TieDutyCard
                  key={duty.id}
                  duty={duty}
                  onDelete={() => handleDelete(duty)}
                  deleting={deletingId === duty.id}
                />
              ))
            )}
          </div>
        )}

        {/* ================= Assign duty ================= */}
        {!loading && tab === "assign" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAssign}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5"
            >
              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {assignError}
                </div>
              )}

              <fieldset
                disabled={draft !== null || assigning || saving}
                className="space-y-5 disabled:opacity-60"
              >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Duty date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dutyDate}
                  onChange={(e) => setDutyDate(e.target.value)}
                  required
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of House Prefects <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                  placeholder="e.g. 4"
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Batches to select from <span className="text-red-500">*</span>
                  </label>
                  {batches.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllBatches}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      {selectedBatchIds.size === batches.length ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>
                {batches.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No batches exist yet. Create batches first so prefects can be selected.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {batches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.has(b.id)}
                            onChange={() => toggleBatch(b.id)}
                            className="w-4 h-4 accent-brand-600"
                          />
                          <span className="text-slate-800">{b.name}</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {b.memberCount} prefect{b.memberCount !== 1 ? "s" : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-2 text-slate-500">
                  {selectedBatchIds.size === 0
                    ? "Select at least one batch."
                    : `${poolSize} house prefect${poolSize !== 1 ? "s" : ""} in the selected batches.`}{" "}
                  Everyone suspended on the duty date is put on duty automatically (from any
                  batch) and counts towards the number above; the rest are picked at random.
                </p>
              </div>
              </fieldset>

              {draft === null && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      assigning ||
                      !dutyDate ||
                      !countValid ||
                      selectedBatchIds.size === 0
                    }
                    className="px-5 py-2.5 rounded-md text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? "Assigning..." : "Assign"}
                  </button>
                </div>
              )}
            </form>

            {draft && (
              <AssignedList
                key={`draft-${draft.attempt}`}
                members={draft.members}
                dutyDate={dutyDate}
                title={
                  draft.attempt > 1
                    ? `Reassigned (attempt ${draft.attempt}) — not saved yet`
                    : "Selected — not saved yet"
                }
                draft
                footer={
                  <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 max-w-sm">
                      {draft.randomCount === 0
                        ? "Every place is filled by suspended prefects, so there is nothing to reassign."
                        : draft.remaining >= draft.randomCount
                          ? `Reassign keeps the suspended prefects and picks ${draft.randomCount} from the ${draft.remaining} not drawn yet.`
                          : `Not enough prefects left to reassign (${draft.remaining} not drawn yet).`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelDraft}
                        disabled={assigning || saving}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReassign}
                        disabled={
                          assigning ||
                          saving ||
                          draft.randomCount === 0 ||
                          draft.remaining < draft.randomCount
                        }
                        className="px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assigning ? "Reassigning..." : "Reassign"}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={assigning || saving}
                        className="px-4 py-2 rounded-md text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Confirm & save"}
                      </button>
                    </div>
                  </div>
                }
              />
            )}

            {lastResult && (
              <AssignedList
                key={lastResult.id}
                members={lastResult.members}
                dutyDate={lastResult.dutyDate}
                title="Assigned for tie duty — saved"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// -------------------------------------------------------
// Assigned list (shown under the form after Assign)
// -------------------------------------------------------

/** navigator.clipboard needs a secure context (HTTPS / localhost). */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("Copy failed");
}

function AssignedList({
  members,
  dutyDate,
  title,
  draft = false,
  footer,
}: {
  members: TieDutyMember[];
  dutyDate: string;
  title: string;
  /** Unsaved preview: no Copy button, amber styling. */
  draft?: boolean;
  footer?: ReactNode;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const codes = members
    .filter((m) => m.code)
    .map((m) => ({ label: m.code!, suspended: !!m.wasSuspended }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const names = members
    .filter((m) => !m.code)
    .map((m) => ({ label: m.name, suspended: !!m.wasSuspended }));
  const groups = [
    { title: "Codes", items: codes },
    { title: "Names", items: names },
  ].filter((g) => g.items.length > 0);

  async function handleCopy() {
    try {
      await copyText(
        groups.map((g) => g.items.map((i) => i.label).join("\n")).join("\n\n")
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border overflow-hidden ${draft ? "border-amber-300" : "border-brand-300"}`}
    >
      <div
        className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${draft ? "bg-amber-50/60" : ""}`}
      >
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDutyDate(dutyDate)}</p>
        </div>
        {!draft && (
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            copyState === "copied"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : copyState === "failed"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {copyState === "copied" && <IconCheck className="w-3 h-3" />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </button>
        )}
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
            {group.title} ({group.items.length})
          </p>
          <ol className="divide-y divide-slate-100">
            {group.items.map((item, idx) => (
              <li key={`${item.label}-${idx}`} className="px-6 py-2.5 flex items-center gap-3 text-sm">
                <span className="w-6 text-right text-slate-400 font-mono">{idx + 1}.</span>
                <span className={`text-slate-800 ${group.title === "Codes" ? "font-mono" : ""}`}>
                  {item.label}
                </span>
                {item.suspended && <SuspendedBadge />}
              </li>
            ))}
          </ol>
        </div>
      ))}
      {footer}
    </div>
  );
}

function SuspendedBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
      Suspended
    </span>
  );
}

// -------------------------------------------------------
// Tie duty card
// -------------------------------------------------------

function TieDutyCard({
  duty,
  onDelete,
  deleting = false,
}: {
  duty: TieDuty;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{formatDutyDate(duty.dutyDate)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {duty.prefectCount} prefect{duty.prefectCount !== 1 ? "s" : ""} from{" "}
            {duty.batchNames.join(", ") || "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Assigned {formatDateTime(duty.createdAt)}
          </p>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-2 py-1 rounded-md text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : "Delete"}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-2.5 text-left text-xs font-medium text-slate-500">Prefect</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-slate-500 hidden md:table-cell">Class</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-slate-500 hidden md:table-cell">Code</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-slate-500">Batch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {duty.members.map((m, idx) => (
              <tr key={`${m.pin}-${idx}`}>
                <td className="px-6 py-3">
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    {m.name}
                    {m.wasSuspended && <SuspendedBadge />}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">PIN: {m.pin}</p>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600 hidden md:table-cell">{m.class || "—"}</td>
                <td className="px-6 py-3 text-sm text-slate-600 font-mono hidden md:table-cell">{m.code || "—"}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{m.batchName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
