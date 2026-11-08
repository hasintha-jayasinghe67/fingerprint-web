"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { TabBar } from "@/components/ui/TabBar";
import { IconClose } from "@/components/icons";
import { durationDays, formatDate, formatRange, isActiveOn } from "./format";
import { PastSuspensions } from "./PastSuspensions";
import { PrefectSuspendList } from "./PrefectSuspendList";
import { SuspendModal } from "./SuspendModal";
import type { Filter, Prefect, Status, Suspension, Tab } from "./types";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

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
          <div role={feedback.ok ? "status" : "alert"} className={`mb-4 p-3 rounded-md text-sm flex items-center justify-between gap-3 ${feedback.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            <p>{feedback.msg}</p>
            <button type="button" onClick={() => setFeedback(null)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md shrink-0" aria-label="Dismiss">
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {!canWrite && (
          <div className="mb-4 p-3 rounded-md text-sm bg-amber-50 text-amber-700 border border-amber-200">
            You can view suspensions, but only admins can add or change them.
          </div>
        )}

        <TabBar
          ariaLabel="Suspension sections"
          fill
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "prefects", label: "Prefects" },
            { id: "past", label: `Past suspensions${pastTotal ? ` (${pastTotal})` : ""}` },
          ]}
        />

        {tab === "prefects" && (
          <PrefectSuspendList
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            counts={counts}
            loading={loading}
            prefects={prefects}
            visible={visible}
            fetchAll={() => { void fetchAll(); }}
            statusOf={statusOf}
            suspensionsByPrefect={suspensionsByPrefect}
            canWrite={canWrite}
            openManage={openManage}
          />
        )}

        {tab === "past" && (
          <PastSuspensions
            pastName={pastName}
            setPastName={setPastName}
            pastCode={pastCode}
            setPastCode={setPastCode}
            minDays={minDays}
            setMinDays={setMinDays}
            maxDays={maxDays}
            setMaxDays={setMaxDays}
            loading={loading}
            pastRows={pastRows}
            pastFiltersActive={pastFiltersActive}
            pastTotal={pastTotal}
          />
        )}
      </main>

      <SuspendModal
        managing={managing}
        setManaging={setManaging}
        saving={saving}
        formError={formError}
        managedHistory={managedHistory}
        editingId={editingId}
        today={today}
        canWrite={canWrite}
        handleEndToday={(s) => { void handleEndToday(s); }}
        startEdit={startEdit}
        handleDelete={(s) => { void handleDelete(s); }}
        handleSubmit={handleSubmit}
        formStart={formStart}
        setFormStart={setFormStart}
        formEnd={formEnd}
        setFormEnd={setFormEnd}
        formReason={formReason}
        setFormReason={setFormReason}
        resetForm={resetForm}
      />
    </div>
  );
}
