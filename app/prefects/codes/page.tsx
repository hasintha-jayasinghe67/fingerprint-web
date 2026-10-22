"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { IconCheck, IconSave } from "@/components/icons";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
  registered: boolean;
}

interface Batch {
  id: number;
  name: string;
  memberCount: number;
  members: Prefect[];
}

interface CodeRow {
  id: number;
  name: string;
  class: string | null;
  pin: string;
  /** Value currently in the form. */
  code: string;
  /** Value loaded from the API (for dirty detection). */
  originalCode: string;
}

export default function BulkCodesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState<number | "">("");
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl("/api/batches"));
      const data = await readApiJson<{ batches?: Batch[]; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || `Failed to load batches (${res.status})`);
      }
      setBatches(data.batches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const selectedBatch = useMemo(
    () =>
      batchId === ""
        ? null
        : batches.find((b) => b.id === batchId) || null,
    [batches, batchId]
  );

  function rowsFromBatch(batch: Batch): CodeRow[] {
    return (batch.members || []).map((m) => ({
      id: m.id,
      name: m.name,
      class: m.class,
      pin: m.pin,
      code: m.code || "",
      originalCode: m.code || "",
    }));
  }

  function selectBatch(nextId: number | "") {
    setBatchId(nextId);
    setSavedMsg(null);
    setError(null);
    if (nextId === "") {
      setRows([]);
      return;
    }
    const batch = batches.find((b) => b.id === nextId);
    setRows(batch ? rowsFromBatch(batch) : []);
  }

  const dirtyCount = rows.filter(
    (r) => r.code.trim() !== r.originalCode.trim()
  ).length;

  function setCode(id: number, code: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, code } : r))
    );
    setSavedMsg(null);
    setError(null);
  }

  async function handleSave() {
    if (!selectedBatch || dirtyCount === 0) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);

    const dirty = rows.filter(
      (r) => r.code.trim() !== r.originalCode.trim()
    );

    try {
      const results = await Promise.all(
        dirty.map(async (r) => {
          const res = await fetch(apiUrl(`/api/prefects/${r.id}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: r.name,
              class: r.class || "",
              code: r.code.trim(),
            }),
          });
          const data = await readApiJson<{ error?: string }>(res);
          if (!res.ok) {
            throw new Error(
              data.error || `Failed to update ${r.name} (${res.status})`
            );
          }
          return r.id;
        })
      );

      const savedById = new Map(
        dirty.map((r) => [r.id, r.code.trim()] as const)
      );
      setRows((prev) =>
        prev.map((r) => {
          if (!savedById.has(r.id)) return r;
          const code = savedById.get(r.id)!;
          return { ...r, code, originalCode: code };
        })
      );
      setBatches((prev) =>
        prev.map((b) =>
          b.id !== selectedBatch.id
            ? b
            : {
                ...b,
                members: (b.members || []).map((m) =>
                  savedById.has(m.id)
                    ? { ...m, code: savedById.get(m.id)! || null }
                    : m
                ),
              }
        )
      );
      setSavedMsg(
        `Saved ${results.length} code${results.length === 1 ? "" : "s"} for ${selectedBatch.name}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save codes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Bulk add codes"
        subtitle="Assign house-prefect codes for an entire batch"
        backTo="/prefects"
        maxWidth="3xl"
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || !selectedBatch}
            className={`min-h-11 inline-flex items-center px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              dirtyCount > 0 && selectedBatch
                ? "bg-brand-700 text-white hover:bg-brand-800"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            {saving ? (
              "Saving…"
            ) : dirtyCount > 0 ? (
              <>
                <IconSave className="w-3 h-3 mr-1" />
                Save {dirtyCount} change{dirtyCount === 1 ? "" : "s"}
              </>
            ) : (
              <>
                <IconCheck className="w-3 h-3 mr-1" />
                Saved
              </>
            )}
          </button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedMsg && (
          <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {savedMsg}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-600 font-medium">No batches yet</p>
            <p className="text-sm text-slate-600 mt-1">
              Create a batch and add prefects to it before assigning codes.
            </p>
            <Link
              href="/batches/add"
              className="inline-block mt-4 px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors"
            >
              + Add a batch
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <label
                htmlFor="bulk-code-batch"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Batch
              </label>
              <select
                id="bulk-code-batch"
                value={batchId === "" ? "" : String(batchId)}
                onChange={(e) => {
                  const v = e.target.value;
                  selectBatch(v === "" ? "" : Number(v));
                }}
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm transition-colors"
              >
                <option value="">Select a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {typeof b.memberCount === "number"
                      ? ` (${b.memberCount})`
                      : b.members
                        ? ` (${b.members.length})`
                        : ""}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Prefects in the selected batch appear below. Existing codes are
                filled in — edit any field, then save once.
              </p>
            </div>

            {!selectedBatch ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                <p className="text-sm text-slate-600">
                  Choose a batch to edit codes.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                <p className="text-slate-600 font-medium">
                  No prefects in {selectedBatch.name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Add members on the batches page, then come back here.
                </p>
                <Link
                  href="/batches"
                  className="inline-block mt-4 px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Open batches
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {selectedBatch.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {rows.length} prefect{rows.length === 1 ? "" : "s"}
                    {dirtyCount > 0 ? ` · ${dirtyCount} unsaved` : ""}
                  </p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const dirty = r.code.trim() !== r.originalCode.trim();
                    return (
                      <li
                        key={r.id}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {r.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {r.class || "—"}
                            <span className="ml-1.5 font-mono text-slate-500">
                              PIN {r.pin}
                            </span>
                            {dirty && (
                              <span className="ml-1.5 text-brand-700">
                                edited
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="sm:w-44 shrink-0">
                          <label
                            htmlFor={`code-${r.id}`}
                            className="sr-only"
                          >
                            Code for {r.name}
                          </label>
                          <input
                            id={`code-${r.id}`}
                            type="text"
                            value={r.code}
                            onChange={(e) => setCode(r.id, e.target.value)}
                            placeholder="e.g. IMP"
                            className={`w-full px-3 py-2 rounded-md border text-sm font-mono transition-colors ${
                              dirty
                                ? "border-brand-300 bg-brand-50 text-brand-900 focus:border-brand-400"
                                : "border-slate-300 bg-white text-slate-900 focus:border-brand-400"
                            }`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">
                    Clears are saved as an empty code. Only changed rows are
                    written.
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || dirtyCount === 0}
                    className={`min-h-11 inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      dirtyCount > 0
                        ? "bg-brand-700 text-white hover:bg-brand-800"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    }`}
                  >
                    {saving ? (
                      "Saving…"
                    ) : dirtyCount > 0 ? (
                      <>
                        <IconSave className="w-3.5 h-3.5 mr-1" />
                        Save codes
                      </>
                    ) : (
                      <>
                        <IconCheck className="w-3.5 h-3.5 mr-1" />
                        Up to date
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
