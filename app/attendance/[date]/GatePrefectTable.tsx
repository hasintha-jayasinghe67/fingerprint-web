"use client";

import { avatarChar } from "@/lib/time";
import { PersonCell, PrefectMeta } from "@/components/ui/PersonCell";
import { GATE_STATUSES, GATE_STATUS_STYLES } from "@/lib/gateStatuses";
import type { GateEntry } from "./types";

export function GatePrefectTable({
  entries,
  gateValue,
  showStatusSelects,
  onStatusChange,
}: {
  entries: GateEntry[];
  gateValue: (entry: GateEntry) => string;
  showStatusSelects: boolean;
  onStatusChange: (prefectId: number, status: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">#</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Prefect</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
              {showStatusSelects ? "Mark status" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry, idx) => {
            const value = gateValue(entry);
            return (
              <tr key={entry.prefectId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3 text-sm text-slate-600 font-mono hidden sm:table-cell">{idx + 1}</td>
                <td className="px-6 py-3">
                  <PersonCell
                    name={entry.name}
                    avatar={avatarChar(entry.name)}
                    meta={
                      <PrefectMeta
                        className={entry.class}
                        pin={entry.pin}
                        code={entry.code}
                        extra={entry.gateAssignment ? <span className="ml-2">{entry.gateAssignment}</span> : null}
                      />
                    }
                  />
                </td>
                <td className="px-6 py-3">
                  {showStatusSelects ? (
                    <select
                      value={value || "To be marked"}
                      onChange={(e) =>
                        onStatusChange(entry.prefectId, e.target.value)
                      }
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${GATE_STATUS_STYLES[value] || "bg-white border-slate-300 text-slate-700"}`}
                    >
                      {GATE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : value ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${GATE_STATUS_STYLES[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      {value}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------
// Sign-in table (shared by the three daily slots)
// -------------------------------------------------------

