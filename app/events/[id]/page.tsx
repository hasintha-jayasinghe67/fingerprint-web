"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiUrl, readApiJson } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { IconRefresh } from "@/components/icons";
import {
  eventStatusClass,
  eventStatusLabel,
  formatClock,
  formatEventStamp,
  fromDatetimeLocal,
  toDatetimeLocal,
} from "../helpers";

interface EventPrefect {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  timestamp?: string;
  time?: string;
}

interface SpecialEventDetail {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "open" | "ended";
  presentCount: number;
  present: EventPrefect[];
  absent: EventPrefect[];
}

const fieldClass =
  "w-full min-h-11 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900";

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [event, setEvent] = useState<SpecialEventDetail | null>(null);
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await fetch(apiUrl(`/api/special-events/${id}`));
      const data = await readApiJson<SpecialEventDetail & { error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error(data.error || "Failed to load event");
      }
      setEvent(data);
      setName(data.name);
      setStartAt(toDatetimeLocal(data.startAt));
      setEndAt(toDatetimeLocal(data.endAt));
    } catch (err) {
      setEvent(null);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (event?.status !== "open") return;
    const handle = window.setInterval(() => {
      void fetchData();
    }, 10_000);
    return () => window.clearInterval(handle);
  }, [event?.status, fetchData]);

  const present = useMemo(() => {
    const rows = event?.present || [];
    return rows.filter((row) =>
      matchesSearch(query, row.name, row.pin, row.code, row.class, row.time)
    );
  }, [event, query]);

  const absent = useMemo(() => {
    const rows = event?.absent || [];
    return rows.filter((row) =>
      matchesSearch(query, row.name, row.pin, row.code, row.class)
    );
  }, [event, query]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/api/special-events/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startAt: fromDatetimeLocal(startAt),
          endAt: fromDatetimeLocal(endAt),
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to update event");
      }
      setNotice("Event window saved.");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !event) return;
    const ok = window.confirm(
      `Delete “${event.name}”? Scans stay in the device log but this event roster goes away.`
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/special-events/${id}`), {
        method: "DELETE",
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete event");
      }
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        title={event?.name || "Event"}
        subtitle={
          event
            ? `${formatEventStamp(event.startAt)} – ${formatEventStamp(event.endAt)}`
            : "Fingerprint sign-in window"
        }
        backTo="/events"
        maxWidth="5xl"
        actions={
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchData();
            }}
            className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            <IconRefresh className="w-3 h-3 mr-1" />
            Refresh
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading event...</p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        {notice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {!loading && event && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${eventStatusClass(event.status)}`}
              >
                {eventStatusLabel(event.status)}
              </span>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">
                  {event.presentCount}
                </span>{" "}
                of {(event.present.length + event.absent.length).toLocaleString()}{" "}
                prefects signed in
              </p>
              {event.status === "open" && (
                <p className="text-xs text-slate-600">
                  Live — refreshes every 10 seconds
                </p>
              )}
            </div>

            {canWrite && (
              <form
                onSubmit={handleSave}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">
                    Name
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Sign-in starts
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={`${fieldClass} font-mono`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Sign-in ends
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={`${fieldClass} font-mono`}
                  />
                </label>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-11 px-5 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save window"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="min-h-11 px-4 py-2 rounded-md bg-white text-red-700 text-sm font-medium border border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete event"}
                  </button>
                </div>
              </form>
            )}

            <div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search prefects…"
                aria-label="Search prefects"
                className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm"
              />
            </div>

            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Signed in ({present.length}
                  {query.trim() ? ` of ${event.present.length}` : ""})
                </h2>
              </div>
              {present.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">
                  No prefects have scanned during this window yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Prefect
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                          PIN
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Signed in
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {present.map((row) => (
                        <tr key={row.prefectId}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {[row.code, row.class].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell font-mono text-slate-700">
                            {row.pin}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800">
                            {row.time ? formatClock(row.time) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Not signed in ({absent.length}
                  {query.trim() ? ` of ${event.absent.length}` : ""})
                </h2>
              </div>
              {absent.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">
                  Everyone on the roll has scanned.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">
                          Prefect
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                          PIN
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absent.map((row) => (
                        <tr key={row.prefectId}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {[row.code, row.class].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell font-mono text-slate-700">
                            {row.pin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
