"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { formatDateDisplay, relativeDayLabel } from "@/lib/time";
import { useQuery } from "@/lib/useQuery";
import SiteHeader from "@/components/site-header";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { PageSkeleton, RefreshBar } from "@/components/ui/Skeleton";
import { IconRefresh, IconArrowRight, IconCheck } from "@/components/icons";

interface AttendanceDate {
  date: string;
  prefectCount: number;
  totalRecords: number;
  hasGate: boolean;
}

const DATES_URL = apiUrl("/api/attendance/dates");

export default function AttendanceDatesPage() {
  const [query, setQuery] = useState("");
  // Same cache key the dashboard prefetches, so this list is often
  // already here when the page opens.
  const { data, error, loading, refreshing, reload } = useQuery(
    DATES_URL,
    async () => {
      const res = await fetch(DATES_URL);
      if (!res.ok) throw new Error("Failed to fetch attendance dates");
      const json = await res.json();
      return (json.dates || []) as AttendanceDate[];
    }
  );

  const dates = data ?? [];

  const filteredDates = useMemo(() => {
    return dates.filter((day) =>
      matchesSearch(
        query,
        day.date,
        formatDateDisplay(day.date),
        relativeDayLabel(day.date),
        String(day.prefectCount),
        String(day.totalRecords)
      )
    );
  }, [dates, query]);

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Attendance Records"
        backTo="/"
        maxWidth="5xl"
        actions={
          <>
            <Link
              href="/events"
              className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/attendance/general"
              className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors"
            >
              General Attendance
            </Link>
            <button
              onClick={() => {
                void reload();
              }}
              className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
            >
              <IconRefresh className="w-3 h-3 mr-1" />
              Refresh
            </button>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RefreshBar active={refreshing} />

        {loading && <PageSkeleton variant="cards" label="Loading attendance dates" />}

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {!loading && !error && dates.length === 0 && (
          <EmptyState title="No attendance records yet">
            Once house prefects begin scanning their fingerprints, dates with
            attendance will appear here.
          </EmptyState>
        )}

        {dates.length > 0 && (
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                {query.trim()
                  ? `${filteredDates.length} of ${dates.length} day${dates.length !== 1 ? "s" : ""}`
                  : `${dates.length} Day${dates.length !== 1 ? "s" : ""} with Attendance`}
              </h2>
              <SearchField
                id="attendance-date-search"
                label="Search by date"
                value={query}
                onChange={setQuery}
                placeholder="Search by date…"
                className="w-full sm:max-w-xs"
              />
            </div>

            {filteredDates.length === 0 ? (
              <EmptyState title="No matching days">
                No fingerprint attendance days match “{query.trim()}”.
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDates.map((day) => {
                  const relativeLabel = relativeDayLabel(day.date);
                  return (
                    <Link
                      key={day.date}
                      href={`/attendance/${day.date}`}
                      className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                            {formatDateDisplay(day.date)}
                          </h3>
                          {relativeLabel && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {relativeLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 group-hover:text-brand-800 transition-colors">
                          <IconArrowRight className="w-4 h-4" />
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">
                            {day.prefectCount}
                          </span>
                          <span className="text-slate-500">
                            prefect{day.prefectCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {day.totalRecords > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">
                              {day.totalRecords}
                            </span>
                            <span className="text-slate-500">scans</span>
                          </div>
                        ) : (
                          day.hasGate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <IconCheck className="w-3 h-3" />
                              Gate record saved
                            </span>
                          )
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
