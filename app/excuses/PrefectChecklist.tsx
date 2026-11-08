"use client";

import Link from "next/link";
import type { Prefect } from "./types";

/** Scrollable prefect picker shared by the log form and the email composer. */
export function PrefectChecklist({
  loading,
  prefects,
  selection,
  onToggle,
}: {
  loading: boolean;
  prefects: Prefect[];
  selection: Set<number>;
  onToggle: (id: number) => void;
}) {
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
            onChange={() => onToggle(p.id)}
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
