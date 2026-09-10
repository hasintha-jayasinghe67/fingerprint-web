"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
  registered: boolean;
  batch_id: number | null;
}

interface BatchSummary {
  id: number;
  name: string;
}

function format12(hhmm: string): string {
  const [h, m] = (hhmm || "07:30").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AddBatchPage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [name, setName] = useState("");
  const [morningSigninTime, setMorningSigninTime] = useState("07:30");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [batchNames, setBatchNames] = useState<Map<number, string>>(new Map());
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && !canWrite) {
      router.push("/");
    }
  }, [authenticated, canWrite, router]);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(apiUrl("/api/prefects")),
        fetch(apiUrl("/api/batches")),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setPrefects(data.prefects || []);
      }
      if (bRes.ok) {
        const data = await bRes.json();
        const map = new Map<number, string>();
        for (const b of (data.batches || []) as BatchSummary[]) {
          map.set(b.id, b.name);
        }
        setBatchNames(map);
      }
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    fetchData();
  }, [canWrite, fetchData]);

  function togglePrefect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/batches"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          morningSigninTime,
          prefectIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create batch");
      router.push("/batches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authenticated || !canWrite) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Add Batch"
        subtitle="Create a group of house prefects"
        backTo="/batches"
        maxWidth="3xl"
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="batchName"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Batch name
            </label>
            <input
              id="batchName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Senior Prefects"
              className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="morningSigninTime"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Morning sign-in time
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <input
                id="morningSigninTime"
                type="time"
                value={morningSigninTime}
                onChange={(e) => setMorningSigninTime(e.target.value)}
                required
                className="px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-lg font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
              <span className="text-sm text-slate-500 pb-2.5">
                ={" "}
                <span className="font-semibold text-slate-700">
                  {format12(morningSigninTime || "07:30")}
                </span>
              </span>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-1.5">
              House prefects in this batch
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Select from the prefects table. A prefect can only be in one batch;
              choosing someone already assigned moves them here.
            </p>

            {loadingList ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : prefects.length === 0 ? (
              <div className="p-4 border border-slate-200 rounded-md text-sm text-slate-500">
                No prefects yet.{" "}
                <Link
                  href="/prefects/add"
                  className="text-brand-700 font-medium hover:underline"
                >
                  Add a prefect
                </Link>{" "}
                first.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                {prefects.map((p) => {
                  const other =
                    p.batch_id != null ? batchNames.get(p.batch_id) : null;
                  return (
                    <label
                      key={p.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
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
                          {p.class || "No class"} · PIN {p.pin}
                          {other ? ` · currently in ${other}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {selected.size} selected
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating…" : "Create batch"}
            </button>
            <Link
              href="/batches"
              className="px-5 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
