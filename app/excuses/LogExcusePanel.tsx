"use client";

import { excuseTypeLabel, formatDateShort, inputClass } from "./format";
import { PrefectChecklist } from "./PrefectChecklist";
import type { ExcuseType, LeaveExcuse, Prefect } from "./types";

/** Log form plus the list of saved leave excuses. */
export function LogExcusePanel({
  editingId,
  resetForm,
  excuseType,
  setExcuseType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  loading,
  prefects,
  selectAll,
  clearSelection,
  selected,
  togglePrefect,
  saving,
  handleSave,
  listLoading,
  excuses,
  startEdit,
  deletingId,
  handleDelete,
}: {
  editingId: number | null;
  resetForm: () => void;
  excuseType: ExcuseType;
  setExcuseType: (value: ExcuseType) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  loading: boolean;
  prefects: Prefect[];
  selectAll: (target: "log" | "compose") => void;
  clearSelection: (target: "log" | "compose") => void;
  selected: Set<number>;
  togglePrefect: (id: number, target: "log" | "compose") => void;
  saving: boolean;
  handleSave: () => void;
  listLoading: boolean;
  excuses: LeaveExcuse[];
  startEdit: (excuse: LeaveExcuse) => void;
  deletingId: number | null;
  handleDelete: (id: number) => void;
}) {
  return (
<>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {editingId ? "Edit leave excuse" : "Log leave excuse"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Choose ES, EG, or both, a date range, and the prefects.
                    Saved gate days in the range update automatically.
                  </p>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">
                    Excuse type
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["es", "ES"],
                        ["eg", "EG"],
                        ["both", "ES + EG"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setExcuseType(value)}
                        className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          excuseType === value
                            ? "bg-brand-700 text-white border-brand-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    From date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value && endDate < e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    To date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="leaveReason"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Reason (optional)
                  </label>
                  <input
                    id="leaveReason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Inter-House College History Quiz finals"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    House prefects
                    {!loading && (
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({selected.size} selected)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Who this leave excuse covers.
                  </p>
                </div>
                {!loading && prefects.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll("log")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSelection("log")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <PrefectChecklist
                loading={loading}
                prefects={prefects}
                selection={selected}
                onToggle={(id) => togglePrefect(id, "log")}
              />
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || selected.size === 0 || !startDate || !endDate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Update leave excuse"
                      : "Log leave excuse"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Logged excuses</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Auto-applied to ES/EG on saved gate attendance days.
                </p>
              </div>
              {listLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : excuses.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500 text-center">
                  No leave excuses logged yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {excuses.map((excuse) => (
                    <li key={excuse.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                              {excuseTypeLabel(excuse.excuseType)}
                            </span>
                            <span className="text-sm font-medium text-slate-800">
                              {formatDateShort(excuse.startDate)}
                              {excuse.endDate !== excuse.startDate
                                ? ` – ${formatDateShort(excuse.endDate)}`
                                : ""}
                            </span>
                          </div>
                          {excuse.reason && (
                            <p className="text-sm text-slate-600">
                              {excuse.reason}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {excuse.prefects.length} prefect
                            {excuse.prefects.length === 1 ? "" : "s"}
                            {excuse.prefects.length > 0
                              ? `: ${excuse.prefects
                                  .slice(0, 6)
                                  .map((p) => p.name)
                                  .join(", ")}${
                                  excuse.prefects.length > 6 ? "…" : ""
                                }`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(excuse)}
                            className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(excuse.id)}
                            disabled={deletingId === excuse.id}
                            className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === excuse.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
  );
}
