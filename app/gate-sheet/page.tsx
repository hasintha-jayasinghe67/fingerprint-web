"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import SiteHeader from "@/components/site-header";
import { headerMenuItemClass } from "@/components/HeaderMenu";
import {
  IconSave,
  IconCheck,
  IconDownload,
  IconMoreVertical,
} from "@/components/icons";
import {
  downloadBatchGateSheetPdf,
  type GateSheetPdfVariant,
} from "@/lib/gateSheetPdf";

const DAYS = [
  { key: 1, label: "Monday" },
  { key: 2, label: "Tuesday" },
  { key: 3, label: "Wednesday" },
  { key: 4, label: "Thursday" },
  { key: 5, label: "Friday" },
];

const ASSIGNMENT_OPTIONS = ["MG", "PG", "PBG"];

interface GateRow {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  batchId: number | null;
  batchName: string | null;
  days: Record<number, string | null>;
}

interface BatchSummary {
  id: number;
  name: string;
  members: {
    id: number;
    name: string;
    class: string | null;
    code: string | null;
    pin: string;
    registered: boolean;
  }[];
}

interface BatchSection {
  id: number | null;
  name: string;
  rows: GateRow[];
}

function emptyDays(): Record<number, string | null> {
  return { 1: null, 2: null, 3: null, 4: null, 5: null };
}

/** Compact kebab menu for per-batch PDF downloads (hidden until opened). */
function BatchDownloadMenu({
  disabled,
  onDownload,
}: {
  disabled?: boolean;
  onDownload: (variant: GateSheetPdfVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Download options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconMoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-40 min-w-[14rem] rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={`${headerMenuItemClass} w-full`}
            onClick={() => {
              setOpen(false);
              onDownload("full");
            }}
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500" />
            Download gate sheet
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${headerMenuItemClass} w-full`}
            onClick={() => {
              setOpen(false);
              onDownload("offProbation");
            }}
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500" />
            Download off probation
          </button>
        </div>
      )}
    </div>
  );
}

export default function GateSheetPage() {
  const [rows, setRows] = useState<GateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [gateRes, batchRes] = await Promise.all([
        fetch(apiUrl("/api/gate-sheet")),
        fetch(apiUrl("/api/batches")),
      ]);
      if (!gateRes.ok) throw new Error("Failed to load gate sheet");

      const gateData = await readApiJson<{
        rows?: {
          prefectId: number;
          pin: string;
          name: string;
          class: string | null;
          code?: string | null;
          registered: boolean;
          days: Record<number, string | null>;
        }[];
      }>(gateRes);

      let batches: BatchSummary[] = [];
      if (batchRes.ok) {
        const batchData = await readApiJson<{ batches?: BatchSummary[] }>(
          batchRes
        );
        batches = batchData.batches || [];
      }

      const batchByPrefect = new Map<
        number,
        { batchId: number; batchName: string; code: string | null; order: number }
      >();
      batches.forEach((b, batchIndex) => {
        (b.members || []).forEach((m, memberIndex) => {
          batchByPrefect.set(m.id, {
            batchId: b.id,
            batchName: b.name,
            code: m.code ?? null,
            // Stable sort: batch order, then member order within the batch.
            order: batchIndex * 10000 + memberIndex,
          });
        });
      });

      const merged: GateRow[] = (gateData.rows || []).map((g) => {
        const meta = batchByPrefect.get(g.prefectId);
        return {
          prefectId: g.prefectId,
          pin: g.pin,
          name: g.name,
          class: g.class,
          code: g.code ?? meta?.code ?? null,
          registered: g.registered,
          batchId: meta?.batchId ?? null,
          batchName: meta?.batchName ?? null,
          days: { ...emptyDays(), ...(g.days || {}) },
        };
      });

      merged.sort((a, b) => {
        const ao = batchByPrefect.get(a.prefectId)?.order;
        const bo = batchByPrefect.get(b.prefectId)?.order;
        if (ao != null && bo != null) return ao - bo;
        if (ao != null) return -1;
        if (bo != null) return 1;
        return a.name.localeCompare(b.name);
      });

      setRows(merged);
      setDirty(false);
      setError(null);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to load gate sheet"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sections: BatchSection[] = useMemo(() => {
    // `rows` is already sorted by batch membership, then unassigned.
    const byBatch = new Map<number | "none", BatchSection>();
    const order: (number | "none")[] = [];

    for (const r of rows) {
      const key = r.batchId ?? "none";
      if (!byBatch.has(key)) {
        byBatch.set(key, {
          id: r.batchId,
          name: r.batchName || "Unassigned",
          rows: [],
        });
        order.push(key);
      }
      byBatch.get(key)!.rows.push(r);
    }

    return order.map((k) => byBatch.get(k)!);
  }, [rows]);

  const setCell = (prefectId: number, day: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.prefectId === prefectId
          ? { ...r, days: { ...r.days, [day]: value || null } }
          : r
      )
    );
    setDirty(true);
    setSavedMsg(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = rows.map((r) => ({
        prefectId: r.prefectId,
        days: r.days,
      }));
      const res = await fetch(apiUrl("/api/gate-sheet"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await readApiJson<{ count?: number; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to save gate sheet");
      setDirty(false);
      setLastSaved(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setSavedMsg(
        `Gate sheet saved — ${data.count} assignment${
          data.count === 1 ? "" : "s"
        } stored.`
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to save gate sheet"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (
    section: BatchSection,
    variant: GateSheetPdfVariant
  ) => {
    downloadBatchGateSheetPdf(
      section.name,
      section.rows.map((r) => ({
        name: r.name,
        code: r.code,
        pin: r.pin,
        days: r.days,
      })),
      variant
    );
  };

  const assignedCount = rows.reduce(
    (sum, r) => sum + DAYS.filter((d) => r.days[d.key]).length,
    0
  );

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Gate Sheet"
        subtitle="Weekly gate duty roster — Mon to Fri, by batch"
        backTo="/"
        actions={
          <>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`min-h-11 inline-flex items-center px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dirty
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {saving ? (
                "Saving…"
              ) : dirty ? (
                <>
                  <IconSave className="w-3 h-3 mr-1" />
                  Save changes
                </>
              ) : (
                <>
                  <IconCheck className="w-3 h-3 mr-1" />
                  Saved
                </>
              )}
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedMsg && (
          <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {savedMsg}
            {lastSaved && (
              <span className="text-emerald-500 ml-2">({lastSaved})</span>
            )}
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

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Assignments:</span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            MG — Main Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            PG — Pool Gate
          </span>
          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            PBG — Palm Beach Gate
          </span>
          <span className="ml-auto">
            {rows.length} prefects · {assignedCount} assignments ·{" "}
            {sections.filter((s) => s.id != null).length} batch
            {sections.filter((s) => s.id != null).length === 1 ? "" : "es"}
          </span>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading gate sheet...</p>
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-600 font-medium">No house prefects yet</p>
            <p className="text-sm text-slate-600 mt-1">
              Add prefects and put them in batches, then come back to assign
              gate duties.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/prefects/add"
                className="inline-block px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors"
              >
                + Add a prefect
              </Link>
              <Link
                href="/batches/add"
                className="inline-block px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                + Add a batch
              </Link>
            </div>
          </div>
        )}

        {!loading &&
          sections.map((section) => (
            <section key={section.id ?? "unassigned"} className="mb-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-800">
                    {section.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {section.rows.length} prefect
                    {section.rows.length === 1 ? "" : "s"}
                    {section.id == null ? " · not in a batch" : ""}
                  </p>
                </div>
                <BatchDownloadMenu
                  disabled={section.rows.length === 0}
                  onDownload={(variant) => handleDownload(section, variant)}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0 min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-4 py-3 sticky left-0 z-10 bg-slate-50 border-b border-slate-200 border-r border-slate-200">
                        House Prefect
                      </th>
                      {DAYS.map((d) => (
                        <th
                          key={d.key}
                          className="px-4 py-3 text-center border-b border-slate-200"
                        >
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((r) => (
                      <tr
                        key={r.prefectId}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-2.5 sticky left-0 z-[1] bg-white border-b border-slate-100 border-r border-slate-200">
                          <p className="font-medium text-slate-800">
                            {r.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {r.class || "—"}
                            {r.code && (
                              <span className="ml-1.5 font-mono text-slate-500">
                                {r.code}
                              </span>
                            )}
                            <span className="ml-1.5 font-mono text-slate-500">
                              PIN {r.pin}
                            </span>
                            {r.registered && (
                              <span className="ml-1.5 text-emerald-600">
                                enrolled
                              </span>
                            )}
                          </p>
                        </td>
                        {DAYS.map((d) => (
                          <td
                            key={d.key}
                            className="px-3 py-2.5 text-center border-b border-slate-100"
                          >
                            <select
                              value={r.days[d.key] || ""}
                              onChange={(e) =>
                                setCell(r.prefectId, d.key, e.target.value)
                              }
                              className={`rounded-md border px-2 py-2 text-sm transition-colors ${
                                r.days[d.key]
                                  ? "border-brand-300 bg-brand-50 font-medium text-brand-800 focus:border-brand-400"
                                  : "border-slate-200 bg-white text-slate-700 focus:border-brand-400"
                              }`}
                            >
                              <option value="">—</option>
                              {ASSIGNMENT_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

        {!loading && rows.length > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Select an assignment for each day, then save. Use the ⋮ menu on
              each batch to download the full codes sheet or an off-probation
              table-only PDF.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`min-h-11 inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                dirty
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {saving ? (
                "Saving…"
              ) : dirty ? (
                <>
                  <IconSave className="w-3.5 h-3.5 mr-1" />
                  Save changes
                </>
              ) : (
                <>
                  <IconCheck className="w-3.5 h-3.5 mr-1" />
                  Up to date
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
