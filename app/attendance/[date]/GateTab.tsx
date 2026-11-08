"use client";

import type { Dispatch, SetStateAction } from "react";
import { GATE_STATUSES } from "@/lib/gateStatuses";
import { GatePrefectTable } from "./GatePrefectTable";
import { GATE_DUTY_TABS, type DayData, type GateDutyTab, type GateEntry } from "./types";

/** Gate attendance tab: duty filters and the status table. */
export function GateTab({
  data,
  gateSaved,
  canEditAfterSave,
  canWrite,
  saveError,
  saveNotice,
  gateCounts,
  showExcuseButton,
  openExcusesModal,
  hasExistingExcuses,
  showStatusSelects,
  handleSaveGate,
  saving,
  gateDutyTab,
  setGateDutyTab,
  gateValue,
  visibleGateEntries,
  query,
  gateDutyEmptyMessage,
  setDrafts,
}: {
  data: DayData;
  gateSaved: boolean;
  canEditAfterSave: boolean;
  canWrite: boolean;
  saveError: string | null;
  saveNotice: string | null;
  gateCounts: Record<string, number>;
  showExcuseButton: boolean;
  openExcusesModal: () => void;
  hasExistingExcuses: boolean;
  showStatusSelects: boolean;
  handleSaveGate: () => void;
  saving: boolean;
  gateDutyTab: GateDutyTab;
  setGateDutyTab: (tab: GateDutyTab) => void;
  gateValue: (entry: GateEntry) => string;
  visibleGateEntries: GateEntry[];
  query: string;
  gateDutyEmptyMessage: string;
  setDrafts: Dispatch<SetStateAction<Record<number, string>>>;
}) {
  return (
              <div>
                {/* Banner */}
                {gateSaved ? (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                    <strong>Saved</strong> — Gate attendance for this date has
                    been saved.
                    {canEditAfterSave
                      ? " As a superuser you can still change statuses."
                      : canWrite
                        ? " Use Add excuses to apply ES/EG lists."
                        : " This date is view-only."}
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg text-brand-800 text-sm">
                    {canWrite ? (
                      <>
                        Mark each prefect&apos;s gate attendance below, then press{" "}
                        <strong>Save Attendance</strong>. Non-latecomers default
                        to <strong>To be marked</strong>. After saving you can
                        add ES/EG excuses.
                      </>
                    ) : (
                      <>You have view-only access to gate attendance.</>
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

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Table header with actions */}
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Gate Attendance ({data.gateEntries.length} prefects)
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {GATE_STATUSES.map((status) => (
                          <span key={status} className="text-xs text-slate-500">
                            {status}:{" "}
                            <strong className="text-slate-700">
                              {gateCounts[status] || 0}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {showExcuseButton && (
                        <button
                          type="button"
                          onClick={openExcusesModal}
                          className="px-5 py-2.5 rounded-md bg-white text-slate-800 text-sm font-semibold border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          {hasExistingExcuses ? "Edit excuses" : "Add excuses"}
                        </button>
                      )}
                      {showStatusSelects && (
                        <button
                          onClick={handleSaveGate}
                          disabled={saving || data.gateEntries.length === 0}
                          className="px-5 py-2.5 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </span>
                          ) : gateSaved ? (
                            "Update Attendance"
                          ) : (
                            "Save Attendance"
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Gate duty sub-tabs */}
                  <div className="px-4 sm:px-6 pt-3 pb-0 border-b border-slate-100">
                    <div className="flex gap-1 overflow-x-auto">
                      {GATE_DUTY_TABS.map((tab) => {
                        const count =
                          tab.id === "all"
                            ? data.gateEntries.length
                            : tab.id === "traitors"
                              ? data.gateEntries.filter(
                                  (e) => gateValue(e) === "Traitor"
                                ).length
                              : data.gateEntries.filter(
                                  (e) =>
                                    e.gateAssignment === tab.id && e.signedIn
                                ).length;
                        const active = gateDutyTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setGateDutyTab(tab.id)}
                            className={`shrink-0 min-h-11 px-3 sm:px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                              active
                                ? tab.id === "traitors"
                                  ? "border-rose-600 text-rose-700 bg-rose-50/60"
                                  : "border-brand-700 text-brand-700 bg-brand-50/60"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {tab.label}
                            <span
                              className={`ml-1.5 text-xs ${
                                active
                                  ? tab.id === "traitors"
                                    ? "text-rose-600"
                                    : "text-brand-800"
                                  : "text-slate-600"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {gateDutyTab !== "all" && gateDutyTab !== "traitors" && (
                      <p className="text-xs text-slate-600 pb-3 pt-1">
                        Prefects assigned to this gate today who have already
                        signed in. Status changes sync to the All tab.
                      </p>
                    )}
                    {gateDutyTab === "all" && (
                      <p className="text-xs text-slate-600 pb-3 pt-1">
                        All house prefects. Statuses stay in sync with the gate
                        tabs.
                      </p>
                    )}
                    {gateDutyTab === "traitors" && (
                      <p className="text-xs text-slate-600 pb-3 pt-1">
                        Prefects marked Traitor for this day (typically after
                        excuses are applied).
                      </p>
                    )}
                  </div>

                  {visibleGateEntries.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-600">
                      {data.gateEntries.length === 0
                        ? "No prefects registered yet. Add house prefects first."
                        : query.trim()
                          ? `No prefects match “${query.trim()}”.`
                          : gateDutyEmptyMessage}
                    </div>
                  ) : (
                    <GatePrefectTable
                      entries={visibleGateEntries}
                      gateValue={gateValue}
                      showStatusSelects={showStatusSelects}
                      onStatusChange={(prefectId, status) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [prefectId]: status,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
  );
}
