"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import SiteHeader from "@/components/site-header";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface AttendanceDate {
  date: string;
  prefectCount: number;
  totalRecords: number;
  hasGate: boolean;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodaySriLankanDateISO(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const slMs = utcMs + 5.5 * 3600000;
  const slDate = new Date(slMs);
  const y = slDate.getFullYear();
  const m = String(slDate.getMonth() + 1).padStart(2, "0");
  const d = String(slDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getRelativeLabel(dateStr: string): string {
  const today = getTodaySriLankanDateISO();
  if (dateStr === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const utcMs = yesterday.getTime() + yesterday.getTimezoneOffset() * 60000;
  const slMs = utcMs + 5.5 * 3600000;
  const slDate = new Date(slMs);
  const y = slDate.getFullYear();
  const m = String(slDate.getMonth() + 1).padStart(2, "0");
  const d = String(slDate.getDate()).padStart(2, "0");
  if (dateStr === `${y}-${m}-${d}`) return "Yesterday";
  return "";
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AttendanceDatesPage() {
  const [dates, setDates] = useState<AttendanceDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiUrl("/api/attendance/dates"));
      if (!res.ok) throw new Error("Failed to fetch attendance dates");

      const data = await res.json();
      setDates(data.dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <SiteHeader
        title="Attendance Records"
        backTo="/"
        maxWidth="5xl"
        actions={
          <>
            <Link
              href="/prefects"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-all active:scale-95"
            >
              Prefects
            </Link>
            <Link
              href="/gate-sheet"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
            >
              Gate Sheet
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
            >
              ⚙ Settings
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
            >
              ↻ Refresh
            </button>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">
                Loading attendance dates...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && dates.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-5xl text-slate-300">—</div>
              <h3 className="text-lg font-semibold text-slate-700">
                No attendance records yet
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                Once house prefects begin scanning their fingerprints, dates
                with attendance will appear here.
              </p>
            </div>
          </div>
        )}

        {/* Date Cards */}
        {!loading && dates.length > 0 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {dates.length} Day{dates.length !== 1 ? "s" : ""} with
                Attendance
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dates.map((d) => {
                const relativeLabel = getRelativeLabel(d.date);
                return (
                  <Link
                    key={d.date}
                    href={`/attendance/${d.date}`}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {formatDateDisplay(d.date)}
                        </h3>
                        {relativeLabel && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {relativeLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-lg">
                        →
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">
                          {d.prefectCount}
                        </span>
                        <span className="text-slate-500">
                          prefect{d.prefectCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {d.totalRecords > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">
                            {d.totalRecords}
                          </span>
                          <span className="text-slate-500">scans</span>
                        </div>
                      ) : (
                        d.hasGate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            ✓ Gate record saved
                          </span>
                        )
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
