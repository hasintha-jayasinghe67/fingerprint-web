"use client";

import { formatClock } from "@/lib/time";
import { SignInTable } from "./SignInTable";
import type { DayData, SlotEntry } from "./types";

/** Morning check-in tab: counts plus the sign-in table. */
export function MorningTab({
  data,
  morning,
  second,
  third,
  lateCount,
  showLatecomers,
  setShowLatecomers,
  displayedMorning,
  query,
}: {
  data: DayData;
  morning: SlotEntry[];
  second: SlotEntry[];
  third: SlotEntry[];
  lateCount: number;
  showLatecomers: boolean;
  setShowLatecomers: (value: boolean | ((value: boolean) => boolean)) => void;
  displayedMorning: SlotEntry[];
  query: string;
}) {
  return (
              <div>
                {/* Slot summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      Morning sign-ins
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{morning.length}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {(data.batches || []).length > 0
                        ? `Batch times; others by 7:00 AM`
                        : "Late after 7:00 AM (no batches)"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      Latecomers
                    </p>
                    <p className={`text-2xl font-semibold ${lateCount > 0 ? "text-red-600" : "text-slate-900"}`}>
                      {lateCount}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      11:15 sign-in
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{second.length}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">
                      1:30 sign-in
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{third.length}</p>
                  </div>
                </div>

                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLatecomers((v) => !v)}
                    className={`min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      showLatecomers
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {showLatecomers
                      ? "Show all"
                      : `Show latecomers${lateCount > 0 ? ` (${lateCount})` : ""}`}
                  </button>
                </div>

                {/* Morning sign-in table */}
                {morning.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-700">
                      No morning sign-ins on this date
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      House prefects who scanned their fingerprint before 10:50
                      AM appear here.
                    </p>
                  </div>
                ) : displayedMorning.length === 0 && query.trim() ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-700">
                      No matching prefects
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      No morning sign-ins match “{query.trim()}”.
                    </p>
                  </div>
                ) : showLatecomers && displayedMorning.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-700">
                      No latecomers on this date
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Every morning sign-in was on time.
                    </p>
                  </div>
                ) : (
                  <SignInTable
                    title={
                      showLatecomers
                        ? `Latecomers (${displayedMorning.length})`
                        : `Morning Check-in Times (${morning.length})`
                    }
                    subtitle={
                      (data.batches || []).length > 0
                        ? `Batch gate/extended: ${(data.batches || [])
                            .map(
                              (b) =>
                                `${b.name} ${formatClock(`${b.morningSigninTime}:00`, false)}`
                            )
                            .join(" · ")}; otherwise after 7:00 AM. Suspended: 15 min earlier`
                        : "Late after 7:00 AM. Suspended: 15 min earlier"
                    }
                    entries={displayedMorning}
                  />
                )}
              </div>
  );
}
