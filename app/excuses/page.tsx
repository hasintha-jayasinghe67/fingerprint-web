"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { ComposeEmailPanel } from "./ComposeEmailPanel";
import { buildEmail } from "./format";
import { LogExcusePanel } from "./LogExcusePanel";
import type { ExcuseType, LeaveExcuse, Prefect, Tab } from "./types";

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
          <LogExcusePanel
            editingId={editingId}
            resetForm={resetForm}
            excuseType={excuseType}
            setExcuseType={setExcuseType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            reason={reason}
            setReason={setReason}
            loading={loading}
            prefects={prefects}
            selectAll={selectAll}
            clearSelection={clearSelection}
            selected={selected}
            togglePrefect={togglePrefect}
            saving={saving}
            handleSave={() => { void handleSave(); }}
            listLoading={listLoading}
            excuses={excuses}
            startEdit={startEdit}
            deletingId={deletingId}
            handleDelete={(id) => { void handleDelete(id); }}
          />
        ) : (
          <ComposeEmailPanel
            fromTime={fromTime}
            setFromTime={setFromTime}
            toTime={toTime}
            setToTime={setToTime}
            composeDate={composeDate}
            setComposeDate={setComposeDate}
            composeReason={composeReason}
            setComposeReason={setComposeReason}
            setCopied={setCopied}
            loading={loading}
            prefects={prefects}
            selectAll={selectAll}
            clearSelection={clearSelection}
            composeSelected={composeSelected}
            togglePrefect={togglePrefect}
            handleCopy={() => { void handleCopy(); }}
            composeSelectedPrefects={composeSelectedPrefects}
            copied={copied}
            emailText={emailText}
          />
        )}

      </main>
    </div>
  );
}
