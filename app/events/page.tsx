"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, readApiJson } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { IconArrowRight, IconRefresh } from "@/components/icons";
import {
  eventStatusClass,
  eventStatusLabel,
  formatEventStamp,
} from "./helpers";

interface SpecialEventSummary {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "open" | "ended";
  presentCount: number;
  excusesApplied?: boolean;
}

export default function EventsListPage() {
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [events, setEvents] = useState<SpecialEventSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl("/api/special-events"));
      const data = await readApiJson<{
        events?: SpecialEventSummary[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to load events");
      }
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return events.filter((event) =>
      matchesSearch(
        query,
        event.name,
        event.status,
        eventStatusLabel(event.status),
        formatEventStamp(event.startAt),
        formatEventStamp(event.endAt),
        String(event.presentCount)
      )
    );
  }, [events, query]);

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Events"
        subtitle="Fingerprint sign-in windows, separate from daily attendance"
        backTo="/"
        maxWidth="5xl"
        actions={
          <>
            {canWrite && (
              <Link
                href="/events/new"
                className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors"
              >
                New Event
              </Link>
            )}
            <button
              type="button"
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
              <p className="text-sm text-slate-500">Loading events...</p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h3 className="text-lg font-semibold text-slate-700">
                No events yet
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                Create a window. Prefects who scan the fingerprint device
                during it are marked present here, not on daily attendance.
              </p>
              {canWrite && (
                <Link
                  href="/events/new"
                  className="mt-2 px-4 py-2 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
                >
                  New Event
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                {query.trim()
                  ? `${filtered.length} of ${events.length} event${events.length !== 1 ? "s" : ""}`
                  : `${events.length} Event${events.length !== 1 ? "s" : ""}`}
              </h2>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or time…"
                aria-label="Search events"
                className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-700">
                  No matching events
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  No events match “{query.trim()}”.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-800 group-hover:text-brand-700 transition-colors truncate">
                          {event.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 font-mono">
                          {formatEventStamp(event.startAt)}
                        </p>
                        <p className="text-xs text-slate-600 font-mono">
                          {formatEventStamp(event.endAt)}
                        </p>
                      </div>
                      <span className="text-slate-500 group-hover:text-brand-800 transition-colors shrink-0">
                        <IconArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${eventStatusClass(event.status)}`}
                        >
                          {eventStatusLabel(event.status)}
                        </span>
                        {event.excusesApplied && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Record
                          </span>
                        )}
                      </span>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {event.presentCount}
                        </span>{" "}
                        present
                      </p>
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
