"use client";

import { formatDateTime, formatDutyDate } from "./format";
import type { TieDuty } from "./types";
import { SuspendedBadge } from "./SuspendedBadge";

export function TieDutyCard({
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
          <p className="text-xs text-slate-600 mt-0.5">
            Assigned {formatDateTime(duty.createdAt)}
          </p>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete tie duty on ${formatDutyDate(duty.dutyDate)}`}
            className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
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
                  {m.class && (
                    <p className="text-xs text-slate-600 md:hidden">{m.class}</p>
                  )}
                  <p className="text-xs text-slate-600 font-mono">PIN: {m.pin}</p>
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
