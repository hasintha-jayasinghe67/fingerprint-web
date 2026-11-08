"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { IconRefresh, IconClose } from "@/components/icons";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { AssignDutyPanel } from "./AssignDutyPanel";
import { formatDateTime, formatDutyDate, sortDuties, todaySriLankan } from "./format";
import { TieDutyCard } from "./TieDutyCard";
import type { Batch, Draft, Tab, TieDuty, TieDutyMember } from "./types";

// -------------------------------------------------------
// Types
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
  /** Names/codes/PINs excluded from random selection (one per line). */
  const [exemptList, setExemptList] = useState("");
  const [exemptLoading, setExemptLoading] = useState(false);
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

  // Prefill exemptions from leave excuses covering the duty date.
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dutyDate)) return;

    let cancelled = false;
    (async () => {
      try {
        setExemptLoading(true);
        const res = await fetch(
          apiUrl(`/api/leave-excuses?date=${encodeURIComponent(dutyDate)}`)
        );
        const data = await readApiJson<{
          excuses?: {
            prefects: {
              id: number;
              name: string;
              code: string | null;
              pin?: string | null;
            }[];
          }[];
          error?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok) {
          // Table may be missing on older deploys — leave the field editable empty.
          setExemptList("");
          return;
        }
        const seen = new Set<string>();
        const lines: string[] = [];
        for (const excuse of data.excuses || []) {
          for (const p of excuse.prefects || []) {
            const label = (p.code || p.name || p.pin || "").trim();
            if (!label) continue;
            const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            lines.push(label);
          }
        }
        lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setExemptList(lines.join("\n"));
        setDraft(null);
      } catch {
        if (!cancelled) setExemptList("");
      } finally {
        if (!cancelled) setExemptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dutyDate]);

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
        exemptText: exemptList,
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
          <div role={feedback.ok ? "status" : "alert"} className={`mb-4 p-3 rounded-md text-sm flex items-center justify-between gap-3 ${feedback.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            <p>{feedback.msg}</p>
            <button type="button" onClick={() => setFeedback(null)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md shrink-0" aria-label="Dismiss">
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        )}

        <TabBar<Tab>
          ariaLabel="Tie duty sections"
          fill
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "history", label: `Past tie duties${duties.length ? ` (${duties.length})` : ""}` },
            { id: "assign", label: "Assign duty" },
          ]}
        />

        {loading && duties.length === 0 && (
          <PageSkeleton variant="rows" label="Loading tie duties" />
        )}

        {/* ================= Past tie duties ================= */}
        {!loading && tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {duties.length} Tie dut{duties.length === 1 ? "y" : "ies"}
              </h2>
              <button
                onClick={() => { void fetchAll(); }}
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
                  className="mt-4 px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors"
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
          <AssignDutyPanel
            handleAssign={handleAssign}
            assignError={assignError}
            draft={draft}
            setDraft={setDraft}
            assigning={assigning}
            saving={saving}
            dutyDate={dutyDate}
            setDutyDate={setDutyDate}
            setLastResult={setLastResult}
            setAssignError={setAssignError}
            count={count}
            setCount={setCount}
            batches={batches}
            selectedBatchIds={selectedBatchIds}
            toggleAllBatches={toggleAllBatches}
            toggleBatch={toggleBatch}
            exemptList={exemptList}
            setExemptList={setExemptList}
            exemptLoading={exemptLoading}
            poolSize={poolSize}
            countValid={countValid}
            handleCancelDraft={handleCancelDraft}
            handleReassign={() => { void handleReassign(); }}
            handleConfirm={() => { void handleConfirm(); }}
            lastResult={lastResult}
          />
        )}

      </main>
    </div>
  );
}

