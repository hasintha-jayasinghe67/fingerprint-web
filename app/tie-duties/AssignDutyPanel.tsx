"use client";

import type { FormEvent } from "react";
import { AssignedList } from "./AssignedList";
import type { Batch, Draft, TieDuty } from "./types";

/** Form that draws a random tie-duty group and confirms it. */
export function AssignDutyPanel({
  handleAssign,
  assignError,
  draft,
  setDraft,
  assigning,
  saving,
  dutyDate,
  setDutyDate,
  setLastResult,
  setAssignError,
  count,
  setCount,
  batches,
  selectedBatchIds,
  toggleAllBatches,
  toggleBatch,
  exemptList,
  setExemptList,
  exemptLoading,
  poolSize,
  countValid,
  handleCancelDraft,
  handleReassign,
  handleConfirm,
  lastResult,
}: {
  handleAssign: (event: FormEvent) => void;
  assignError: string | null;
  draft: Draft | null;
  setDraft: (value: Draft | null) => void;
  assigning: boolean;
  saving: boolean;
  dutyDate: string;
  setDutyDate: (value: string) => void;
  setLastResult: (value: TieDuty | null) => void;
  setAssignError: (value: string | null) => void;
  count: string;
  setCount: (value: string) => void;
  batches: Batch[];
  selectedBatchIds: Set<number>;
  toggleAllBatches: () => void;
  toggleBatch: (id: number) => void;
  exemptList: string;
  setExemptList: (value: string) => void;
  exemptLoading: boolean;
  poolSize: number;
  countValid: boolean;
  handleCancelDraft: () => void;
  handleReassign: () => void;
  handleConfirm: () => void;
  lastResult: TieDuty | null;
}) {
  return (
<div className="space-y-6">
            <form
              onSubmit={handleAssign}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5"
            >
              {assignError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {assignError}
                </div>
              )}

              <fieldset
                disabled={draft !== null || assigning || saving}
                className="space-y-5 disabled:opacity-60"
              >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Duty date <span className="text-red-700">*</span>
                </label>
                <input
                  type="date"
                  value={dutyDate}
                  onChange={(e) => {
                    setDutyDate(e.target.value);
                    setDraft(null);
                    setLastResult(null);
                    setAssignError(null);
                  }}
                  required
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of House Prefects <span className="text-red-700">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                  placeholder="e.g. 4"
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Batches to select from <span className="text-red-700">*</span>
                  </label>
                  {batches.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllBatches}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      {selectedBatchIds.size === batches.length ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>
                {batches.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No batches exist yet. Create batches first so prefects can be selected.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {batches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.has(b.id)}
                            onChange={() => toggleBatch(b.id)}
                            className="w-4 h-4 accent-brand-600"
                          />
                          <span className="text-slate-800">{b.name}</span>
                        </span>
                        <span className="text-xs text-slate-600">
                          {b.memberCount} prefect{b.memberCount !== 1 ? "s" : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-2 text-slate-500">
                  {selectedBatchIds.size === 0
                    ? "Select at least one batch."
                    : `${poolSize} house prefect${poolSize !== 1 ? "s" : ""} in the selected batches.`}{" "}
                  Everyone suspended on the duty date is put on duty automatically (from any
                  batch) and counts towards the number above; the rest are picked at random
                  after exemptions.
                </p>
              </div>

              <div>
                <label
                  htmlFor="tie-exempt-list"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Exempt from random selection
                  {exemptLoading && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      Loading leave excuses…
                    </span>
                  )}
                </label>
                <textarea
                  id="tie-exempt-list"
                  rows={6}
                  value={exemptList}
                  onChange={(e) => {
                    setExemptList(e.target.value);
                    setDraft(null);
                  }}
                  placeholder={
                    "One code, name, or PIN per line\n(auto-filled from leave excuses for this date)"
                  }
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm font-mono transition-colors resize-y min-h-[8rem]"
                />
                <p className="text-xs mt-2 text-slate-500">
                  Prefects listed here are skipped when drawing at random. The list is
                  filled automatically from leave excuses covering the duty date; you can
                  add or remove lines. Suspended prefects are still included on duty.
                </p>
              </div>
              </fieldset>

              {draft === null && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      assigning ||
                      !dutyDate ||
                      !countValid ||
                      selectedBatchIds.size === 0
                    }
                    className="px-5 py-2.5 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? "Assigning..." : "Assign"}
                  </button>
                </div>
              )}
            </form>

            {draft && (
              <AssignedList
                key={`draft-${draft.attempt}`}
                members={draft.members}
                dutyDate={dutyDate}
                title={
                  draft.attempt > 1
                    ? `Reassigned (attempt ${draft.attempt}) — not saved yet`
                    : "Selected — not saved yet"
                }
                draft
                footer={
                  <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 max-w-sm">
                      {draft.randomCount === 0
                        ? "Every place is filled by suspended prefects, so there is nothing to reassign."
                        : draft.remaining >= draft.randomCount
                          ? `Reassign keeps the suspended prefects and picks ${draft.randomCount} from the ${draft.remaining} not drawn yet.`
                          : `Not enough prefects left to reassign (${draft.remaining} not drawn yet).`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelDraft}
                        disabled={assigning || saving}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReassign}
                        disabled={
                          assigning ||
                          saving ||
                          draft.randomCount === 0 ||
                          draft.remaining < draft.randomCount
                        }
                        className="px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assigning ? "Reassigning..." : "Reassign"}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={assigning || saving}
                        className="px-4 py-2 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Confirm & save"}
                      </button>
                    </div>
                  </div>
                }
              />
            )}

            {lastResult && (
              <AssignedList
                key={lastResult.id}
                members={lastResult.members}
                dutyDate={lastResult.dutyDate}
                title="Assigned for tie duty — saved"
              />
            )}
          </div>
  );
}
