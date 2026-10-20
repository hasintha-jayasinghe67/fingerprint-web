"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import HeaderMenu, { headerMenuItemClass } from "@/components/HeaderMenu";
import { IconArrowRight, IconRefresh, IconSettings } from "@/components/icons";
import { formatDateDisplay } from "./helpers";

interface GeneralAttendanceSummary {
  id: number;
  name: string;
  date: string;
  prefectCount: number;
}

export default function GeneralAttendanceListPage() {
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [records, setRecords] = useState<GeneralAttendanceSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiUrl("/api/general-attendance"));
      const data = await readApiJson<{
        records?: GeneralAttendanceSummary[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch general attendance");
      }
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      matchesSearch(
        query,
        record.name,
        record.date,
        formatDateDisplay(record.date),
        String(record.prefectCount)
      )
    );
  }, [records, query]);

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="General Attendance"
        subtitle="Special and off-site duties"
        backTo="/attendance"
        maxWidth="5xl"
        actions={
          <>
            <HeaderMenu label="Navigate">
              <Link href="/attendance" className={headerMenuItemClass}>
                All Dates
              </Link>
              <Link href="/prefects" className={headerMenuItemClass}>
                Prefects
              </Link>
              <Link href="/batches" className={headerMenuItemClass}>
                Batches
              </Link>
              <Link href="/gate-sheet" className={headerMenuItemClass}>
                Gate Sheet
              </Link>
              <Link href="/excuses" className={headerMenuItemClass}>
                Excuses
              </Link>
              <Link href="/settings" className={headerMenuItemClass}>
                <IconSettings className="w-3 h-3" />
                Settings
              </Link>
            </HeaderMenu>
            {canWrite && (
              <Link
                href="/attendance/general/new"
                className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors"
              >
                New Record
              </Link>
            )}
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
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
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">
                Loading general attendance...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h3 className="text-lg font-semibold text-slate-700">
                No general attendance records yet
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                Create a record when house prefects are on special or off-site
                duty and cannot use the fingerprint device.
              </p>
              {canWrite && (
                <Link
                  href="/attendance/general/new"
                  className="mt-2 px-4 py-2 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
                >
                  New Record
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                {query.trim()
                  ? `${filteredRecords.length} of ${records.length} record${records.length !== 1 ? "s" : ""}`
                  : `${records.length} Record${records.length !== 1 ? "s" : ""}`}
              </h2>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or date…"
                aria-label="Search general attendance records"
                className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm"
              />
            </div>

            {filteredRecords.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-700">
                  No matching records
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  No general attendance records match “{query.trim()}”.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/attendance/general/${record.id}`}
                  className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                        {record.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {formatDateDisplay(record.date)}
                      </p>
                    </div>
                    <span className="text-slate-500 group-hover:text-brand-800 transition-colors">
                      <IconArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-semibold text-slate-700">
                      {record.prefectCount}
                    </span>
                    <span className="text-slate-500">
                      prefect{record.prefectCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
