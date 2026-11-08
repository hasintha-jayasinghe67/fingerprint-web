"use client";

import type { FormEvent } from "react";
import Modal from "@/components/Modal";
import { formatRange, inputClass, isActiveOn } from "./format";
import type { Prefect, Suspension } from "./types";

/** History and the add/edit form for one prefect's suspensions. */
export function SuspendModal({
  managing,
  setManaging,
  saving,
  formError,
  managedHistory,
  editingId,
  today,
  canWrite,
  handleEndToday,
  startEdit,
  handleDelete,
  handleSubmit,
  formStart,
  setFormStart,
  formEnd,
  setFormEnd,
  formReason,
  setFormReason,
  resetForm,
}: {
  managing: Prefect | null;
  setManaging: (value: Prefect | null) => void;
  saving: boolean;
  formError: string | null;
  managedHistory: Suspension[];
  editingId: number | null;
  today: string;
  canWrite: boolean;
  handleEndToday: (suspension: Suspension) => void;
  startEdit: (suspension: Suspension) => void;
  handleDelete: (suspension: Suspension) => void;
  handleSubmit: (event: FormEvent) => void;
  formStart: string;
  setFormStart: (value: string) => void;
  formEnd: string;
  setFormEnd: (value: string) => void;
  formReason: string;
  setFormReason: (value: string) => void;
  resetForm: () => void;
}) {
  return (
      <Modal
        isOpen={managing !== null}
        dismissible={!saving}
        onClose={() => {
          if (!saving) setManaging(null);
        }}
        title={managing ? `Suspensions — ${managing.name}` : "Suspensions"}
        size="lg"
      >
        <div className="space-y-5">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* History */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">History</h3>
            {managedHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No suspensions recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {managedHistory.map((s) => (
                  <li
                    key={s.id}
                    className={`px-3 py-2.5 flex items-start justify-between gap-3 ${editingId === s.id ? "bg-brand-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        {formatRange(s)}
                        {isActiveOn(s, today) && (
                          <span className="ml-2 text-xs font-medium text-violet-700">Current</span>
                        )}
                      </p>
                      {s.reason && (
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{s.reason}</p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.endDate === null && isActiveOn(s, today) && (
                          <button
                            type="button"
                            onClick={() => handleEndToday(s)}
                            disabled={saving}
                            className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            End today
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          disabled={saving}
                          className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={saving}
                          className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                          aria-label={`Delete suspension ${formatRange(s)}`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add / edit form */}
          {canWrite && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-700">
                {editingId ? "Edit suspension" : "New suspension"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Start date <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    End date <span className="text-slate-600 font-normal">(blank = ongoing)</span>
                  </label>
                  <input
                    type="date"
                    value={formEnd}
                    min={formStart || undefined}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason <span className="text-slate-600 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-slate-500">
                Both dates are inclusive. Morning sign-ins on these dates must be 15 minutes
                earlier than usual.
              </p>
              <div className="flex items-center justify-between">
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel edit
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={saving || !formStart}
                  className="px-4 py-2 rounded-md text-sm font-medium min-h-11 bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add suspension"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
  );
}
