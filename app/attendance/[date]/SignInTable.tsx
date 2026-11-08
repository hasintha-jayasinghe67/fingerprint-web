"use client";

import { avatarChar, formatClock } from "@/lib/time";
import { IconCheck, IconWarning } from "@/components/icons";
import { PersonCell, PrefectMeta } from "@/components/ui/PersonCell";
import type { SlotEntry } from "./types";

export function SignInTable({
  title,
  subtitle,
  entries,
  showStatus = true,
}: {
  title: string;
  subtitle?: string;
  entries: SlotEntry[];
  showStatus?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <span className="text-xs text-slate-600">{subtitle}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Prefect</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Sign-in time</th>
              {showStatus && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, idx) => (
              <tr
                key={`${entry.pin}-${idx}`}
                className={`transition-colors ${
                  entry.late && entry.suspended
                    ? "bg-violet-50/70 hover:bg-violet-50"
                    : entry.late
                      ? "bg-red-50/60 hover:bg-red-50"
                      : "hover:bg-slate-50/50"
                }`}
              >
                <td className="px-6 py-3.5 text-sm text-slate-600 font-mono hidden sm:table-cell">{idx + 1}</td>
                <td className="px-6 py-3.5">
                  <PersonCell
                    name={entry.name}
                    avatar={avatarChar(entry.name)}
                    meta={<PrefectMeta className={entry.class} pin={entry.pin} code={entry.code} />}
                  />
                </td>
                <td className="px-6 py-3.5">
                  <span
                    className={`text-sm font-mono font-medium ${
                      entry.late && entry.suspended ? "text-violet-700" : "text-slate-700"
                    }`}
                  >
                    {formatClock(entry.time)}
                  </span>
                  {entry.suspended && entry.deadline && (
                    <p className="text-xs text-violet-600 mt-0.5">
                      Suspended · due by {formatClock(entry.deadline || "", false)}
                    </p>
                  )}
                </td>
                {showStatus && (
                  <td className="px-6 py-3.5">
                    {entry.late && entry.suspended ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-600 text-white border border-violet-700">
                        <IconWarning className="w-3 h-3" />
                        SUSPENDED · LATE
                      </span>
                    ) : entry.late ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white border border-red-700">
                        <IconWarning className="w-3 h-3" />
                        LATE
                      </span>
                    ) : entry.lateExcused ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Late excused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <IconCheck className="w-3 h-3" />
                        On time
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
