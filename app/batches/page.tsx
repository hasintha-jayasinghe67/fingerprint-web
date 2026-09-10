"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import HeaderMenu, { headerMenuItemClass } from "@/components/HeaderMenu";
import Modal from "@/components/Modal";
import { IconClose, IconRefresh, IconSettings } from "@/components/icons";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
  registered: boolean;
  batch_id: number | null;
}

interface Batch {
  id: number;
  name: string;
  morningSigninTime: string;
  extended: boolean;
  memberCount: number;
  members: Prefect[];
}

function format12(hhmm: string): string {
  const [h, m] = (hhmm || "07:30").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export default function BatchesPage() {
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(
    null
  );
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editing, setEditing] = useState<Batch | null>(null);
  const [editName, setEditName] = useState("");
  const [editTime, setEditTime] = useState("07:30");
  const [editExtended, setEditExtended] = useState(false);
  const [editSelected, setEditSelected] = useState<Set<number>>(new Set());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const batchNameById = useCallback(() => {
    const map = new Map<number, string>();
    for (const b of batches) map.set(b.id, b.name);
    return map;
  }, [batches]);

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        fetch(apiUrl("/api/batches")),
        fetch(apiUrl("/api/prefects")),
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        setBatches(data.batches || []);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setPrefects(data.prefects || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleToggleExtended(batch: Batch) {
    if (!canWrite) return;
    setTogglingId(batch.id);
    setFeedback(null);
    try {
      const res = await fetch(apiUrl(`/api/batches/${batch.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extended: !batch.extended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update batch");
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? data.batch : b))
      );
    } catch (err) {
      setFeedback({
        msg: err instanceof Error ? err.message : "Unknown error",
        ok: false,
      });
    } finally {
      setTogglingId(null);
    }
  }

  function openEdit(batch: Batch) {
    setEditing(batch);
    setEditName(batch.name);
    setEditTime(batch.morningSigninTime || "07:30");
    setEditExtended(!!batch.extended);
    setEditSelected(new Set(batch.members.map((m) => m.id)));
    setEditError(null);
  }

  function togglePrefect(id: number) {
    setEditSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(apiUrl(`/api/batches/${editing.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          morningSigninTime: editTime,
          extended: editExtended,
          prefectIds: Array.from(editSelected),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update batch");
      setEditing(null);
      setFeedback({ msg: "Batch updated.", ok: true });
      fetchAll();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(batch: Batch) {
    if (
      !window.confirm(
        `Delete batch "${batch.name}"? Prefects will be unassigned from this batch.`
      )
    ) {
      return;
    }
    setDeletingId(batch.id);
    try {
      const res = await fetch(apiUrl(`/api/batches/${batch.id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        setBatches((prev) => prev.filter((b) => b.id !== batch.id));
        setFeedback({ msg: "Batch deleted.", ok: true });
        fetchAll();
      }
    } finally {
      setDeletingId(null);
    }
  }

  const names = batchNameById();

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Batches"
        subtitle="Groups of house prefects with shared morning sign-in times"
        backTo="/"
        maxWidth="5xl"
        actionsLayout="wrap"
        actions={
          <>
            <HeaderMenu label="Navigate">
              <Link href="/attendance" role="menuitem" className={headerMenuItemClass}>
                Attendance
              </Link>
              <Link href="/prefects" role="menuitem" className={headerMenuItemClass}>
                Prefects
              </Link>
              <Link href="/gate-sheet" role="menuitem" className={headerMenuItemClass}>
                Gate Sheet
              </Link>
              {canWrite && (
                <Link href="/settings" role="menuitem" className={headerMenuItemClass}>
                  <IconSettings className="w-3 h-3" />
                  Settings
                </Link>
              )}
            </HeaderMenu>
            {canWrite && (
              <Link
                href="/batches/add"
                className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                + Add Batch
              </Link>
            )}
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              feedback.ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.msg}
            <button
              onClick={() => setFeedback(null)}
              className="ml-2 font-bold"
              aria-label="Dismiss"
            >
              <IconClose className="w-3 h-3" />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && batches.length === 0 && (
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              No batches yet
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Create a batch to group house prefects and set their morning
              sign-in time.
            </p>
            {canWrite && (
              <Link
                href="/batches/add"
                className="inline-flex px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                + Add Batch
              </Link>
            )}
          </div>
        )}

        {!loading && batches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {batches.length} Batch{batches.length !== 1 ? "es" : ""}
              </h2>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchAll();
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <IconRefresh className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      Sign-in time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                      Extended
                    </th>
                    {canWrite && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="text-sm font-medium text-slate-800">
                          {b.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-mono text-slate-700">
                        {format12(b.morningSigninTime)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-600 hidden sm:table-cell">
                        {b.memberCount}
                        {b.members.length > 0 && (
                          <span className="text-slate-400 ml-1">
                            (
                            {b.members
                              .slice(0, 3)
                              .map((m) => m.name)
                              .join(", ")}
                            {b.members.length > 3 ? "…" : ""})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={b.extended}
                            disabled={!canWrite || togglingId === b.id}
                            onChange={() => handleToggleExtended(b)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          {b.extended ? "On" : "Off"}
                        </label>
                      </td>
                      {canWrite && (
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(b)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              disabled={deletingId === b.id}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              {deletingId === b.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit batch"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Batch name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Morning sign-in time
            </label>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              required
              className="px-3 py-2 rounded-md border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              = {format12(editTime || "07:30")}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editExtended}
              onChange={(e) => setEditExtended(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Extended — members must meet this time even without gate duty
          </label>
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">
              House prefects
            </p>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
              {prefects.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No prefects found.</p>
              ) : (
                prefects.map((p) => {
                  const otherBatch =
                    p.batch_id && p.batch_id !== editing?.id
                      ? names.get(p.batch_id)
                      : null;
                  return (
                    <label
                      key={p.id}
                      className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editSelected.has(p.id)}
                        onChange={() => togglePrefect(p.id)}
                        className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">
                          {p.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          PIN {p.pin}
                          {otherBatch ? ` · currently in ${otherBatch}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              A prefect can only be in one batch. Selecting someone from another
              batch moves them here.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
