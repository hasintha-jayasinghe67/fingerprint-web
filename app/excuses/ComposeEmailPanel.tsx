"use client";

import { IconCheck } from "@/components/icons";
import { inputClass } from "./format";
import { PrefectChecklist } from "./PrefectChecklist";
import type { Prefect } from "./types";

/** Email composer: times, prefects, and a copyable preview. */
export function ComposeEmailPanel({
  fromTime,
  setFromTime,
  toTime,
  setToTime,
  composeDate,
  setComposeDate,
  composeReason,
  setComposeReason,
  setCopied,
  loading,
  prefects,
  selectAll,
  clearSelection,
  composeSelected,
  togglePrefect,
  handleCopy,
  composeSelectedPrefects,
  copied,
  emailText,
}: {
  fromTime: string;
  setFromTime: (value: string) => void;
  toTime: string;
  setToTime: (value: string) => void;
  composeDate: string;
  setComposeDate: (value: string) => void;
  composeReason: string;
  setComposeReason: (value: string) => void;
  setCopied: (value: boolean) => void;
  loading: boolean;
  prefects: Prefect[];
  selectAll: (target: "log" | "compose") => void;
  clearSelection: (target: "log" | "compose") => void;
  composeSelected: Set<number>;
  togglePrefect: (id: number, target: "log" | "compose") => void;
  handleCopy: () => void;
  composeSelectedPrefects: Prefect[];
  copied: boolean;
  emailText: string;
}) {
  return (
<>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Leave details</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Fill in the times, date, and duty reason for the email.
                </p>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fromTime"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    From
                  </label>
                  <input
                    id="fromTime"
                    type="text"
                    value={fromTime}
                    onChange={(e) => {
                      setFromTime(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="12.10 p.m."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="toTime"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    To
                  </label>
                  <input
                    id="toTime"
                    type="text"
                    value={toTime}
                    onChange={(e) => {
                      setToTime(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="1.30 p.m."
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="leaveDate"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="leaveDate"
                    type="text"
                    value={composeDate}
                    onChange={(e) => {
                      setComposeDate(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="July 13th"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="reason"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Duty reason
                  </label>
                  <input
                    id="reason"
                    type="text"
                    value={composeReason}
                    onChange={(e) => {
                      setComposeReason(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="the finals’ competition for the Inter-House College History Quiz"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Appears after “as they have duty at …”
                  </p>
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
                        ({composeSelected.size} selected)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Select who should appear in the leave email.
                  </p>
                </div>
                {!loading && prefects.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll("compose")}
                      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSelection("compose")}
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
                selection={composeSelected}
                onToggle={(id) => togglePrefect(id, "compose")}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">Email preview</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Updates as you edit details and selection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={composeSelectedPrefects.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold min-h-11 bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {copied ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    "Copy email"
                  )}
                </button>
              </div>
              <pre className="px-6 py-5 text-sm font-mono text-slate-800 whitespace-pre-wrap break-words leading-relaxed bg-slate-50/50">
                {composeSelectedPrefects.length === 0
                  ? "Select at least one house prefect to generate the email."
                  : emailText}
              </pre>
            </div>
          </>
  );
}
