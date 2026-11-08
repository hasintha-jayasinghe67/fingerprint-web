"use client";

import { matchesSearch } from "@/lib/search";
import { avatarChar, formatClock } from "@/lib/time";
import { PersonCell, PrefectMeta } from "@/components/ui/PersonCell";
import { SaveButton } from "@/components/ui/SaveButton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { GATE_STATUS_STYLES } from "@/lib/gateStatuses";
import { SLOT_STATUSES } from "./types";
import type { SlotAttendanceBlock, SlotAttendanceEntry } from "./types";

export function SlotAttendancePanel({
  label,
  cutoffCopy,
  block,
  signedInCount,
  query,
  slotValue,
  canEdit,
  canWrite,
  saving,
  saveError,
  saveNotice,
  onStatusChange,
  onSave,
  canEditAfterSave,
}: {
  label: string;
  cutoffCopy: string;
  block: SlotAttendanceBlock;
  signedInCount: number;
  query: string;
  slotValue: (entry: SlotAttendanceEntry) => string;
  canEdit: boolean;
  canWrite: boolean;
  saving: boolean;
  saveError: string | null;
  saveNotice: string | null;
  onStatusChange: (prefectId: number, status: string) => void;
  onSave: () => void;
  canEditAfterSave: boolean;
}) {
  const presentCount = block.entries.filter(
    (e) => slotValue(e) === "Present"
  ).length;
  const absentCount = block.entries.filter(
    (e) => slotValue(e) === "Absent"
  ).length;
  const visibleEntries = block.entries.filter((entry) =>
    matchesSearch(query, entry.name, entry.class, entry.code, entry.pin)
  );

  return (
    <div>
      {block.saved ? (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          <strong>Saved</strong> — {label} attendance for this date has been
          saved.
          {canEditAfterSave
            ? " As a superuser you can still change statuses."
            : canWrite
              ? " This session is view-only."
              : " This date is view-only."}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg text-brand-800 text-sm">
          {canWrite ? (
            <>
              Mark each prefect Present or Absent, then press{" "}
              <strong>Save Attendance</strong>. Only prefects who signed in
              for morning check-in are listed. Those who also signed in for
              this session default to Present; others default to Absent.
            </>
          ) : (
            <>You have view-only access to {label} attendance.</>
          )}
        </div>
      )}

      {saveError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {saveError}
        </div>
      )}
      {saveNotice && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
          {saveNotice}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard label={`${label} sign-ins`} value={signedInCount} hint={cutoffCopy} />
        <SummaryCard label="Present" value={presentCount} valueClassName="text-emerald-700" />
        <SummaryCard label="Absent" value={absentCount} valueClassName="text-red-600" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">
              {label} Attendance ({block.entries.length} prefects)
            </h3>
            <p className="text-xs text-slate-600 mt-1">{cutoffCopy}</p>
          </div>
          {canEdit && (
            <SaveButton
              saving={saving}
              onClick={onSave}
              disabled={block.entries.length === 0}
              label={block.saved ? "Update Attendance" : "Save Attendance"}
            />
          )}
        </div>

        {block.entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No morning check-ins on this date. Prefects who signed in for
            morning check-in appear here.
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No prefects match “{query.trim()}”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    Prefect
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    Sign-in time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                    {canEdit ? "Mark status" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry, idx) => {
                  const value = slotValue(entry);
                  return (
                    <tr
                      key={entry.prefectId}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-slate-600 font-mono hidden sm:table-cell">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3">
                        <PersonCell
                          name={entry.name}
                          avatar={avatarChar(entry.name)}
                          meta={<PrefectMeta className={entry.class} pin={entry.pin} code={entry.code} />}
                        />
                      </td>
                      <td className="px-6 py-3">
                        {entry.time ? (
                          <span className="text-sm font-mono font-medium text-slate-700">
                            {formatClock(entry.time)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {canEdit ? (
                          <select
                            value={value}
                            onChange={(e) =>
                              onStatusChange(entry.prefectId, e.target.value)
                            }
                            className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${GATE_STATUS_STYLES[value] || "bg-white border-slate-300 text-slate-700"}`}
                          >
                            {SLOT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${GATE_STATUS_STYLES[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            {value}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Gate prefect status table (shared across gate duty tabs)
// -------------------------------------------------------

