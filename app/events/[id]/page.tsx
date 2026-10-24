"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiUrl, readApiJson } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import AttendanceBreakdown from "@/components/AttendanceBreakdown";
import { IconRefresh } from "@/components/icons";
import { GATE_STATUS_STYLES } from "@/lib/gateStatuses";
import { avatarChar, isExcusedStatus, matchPrefectList } from "@/app/attendance/general/helpers";
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
  time?: string | null;
  status?: string;
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
  entries?: EventPrefect[];
  attendanceSaved?: boolean;
  excusesApplied?: boolean;
  attendanceUnavailable?: boolean;
  suggestedExcused?: string;
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
  const [applying, setApplying] = useState(false);
  const [excusedText, setExcusedText] = useState("");
  const excusesEdited = useRef(false);
  const excusesForId = useRef<string | null>(null);
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
    if (!id) return;
    if (excusesForId.current !== id) {
      excusesForId.current = id;
      excusesEdited.current = false;
      setExcusedText("");
    }
    if (excusesEdited.current) return;
    if (!event?.attendanceSaved || event.excusesApplied) return;
    setExcusedText(event.suggestedExcused || "");
  }, [id, event?.attendanceSaved, event?.excusesApplied, event?.suggestedExcused]);

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

  const recordEntries = useMemo(() => {
    const rows = event?.entries || [];
    return rows.filter((row) =>
      matchesSearch(query, row.name, row.pin, row.code, row.class, row.status, row.time)
    );
  }, [event, query]);

  const recordCounts = useMemo(() => {
    const rows = event?.entries || [];
    let presentCount = 0;
    let excused = 0;
    let traitors = 0;
    for (const row of rows) {
      if (row.status === "Present") presentCount += 1;
      else if (isExcusedStatus(row.status)) excused += 1;
      else if (row.status === "Traitor") traitors += 1;
    }
    return { present: presentCount, excused, traitors, total: rows.length };
  }, [event]);

  const excusePreview = useMemo(() => {
    if (!event?.attendanceSaved || event.excusesApplied) return null;
    const roster = [...(event.present || []), ...(event.absent || [])];
    const { matchedIds, unmatchedTokens } = matchPrefectList(excusedText, roster);
    const presentIds = new Set((event.present || []).map((row) => row.prefectId));
    let excused = 0;
    for (const prefectId of matchedIds) {
      if (!presentIds.has(prefectId)) excused += 1;
    }
    const absentCount = (event.absent || []).length;
    return {
      present: (event.present || []).length,
      excused,
      traitors: Math.max(absentCount - excused, 0),
      unmatchedTokens,
    };
  }, [event, excusedText]);

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

  async function handleExcuses(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setApplying(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/api/special-events/${id}/excuses`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excused: excusedText }),
      });
      const data = await readApiJson<{
        error?: string;
        unmatched?: string[];
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to save excuses");
      }
      const unmatched = data.unmatched || [];
      setNotice(
        unmatched.length > 0
          ? `Excuses saved. Not matched: ${unmatched.join(", ")}.`
          : "Excuses saved."
      );
      setExcusedText("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setApplying(false);
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
              {event.excusesApplied ? (
                <p className="text-sm text-slate-600">Attendance record saved</p>
              ) : (
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">
                    {event.presentCount}
                  </span>{" "}
                  of{" "}
                  {(event.present.length + event.absent.length).toLocaleString()}{" "}
                  prefects signed in
                </p>
              )}
              {event.attendanceSaved && !event.excusesApplied && (
                <p className="text-xs font-medium text-slate-700">
                  Attendance saved
                </p>
              )}
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
                    disabled={Boolean(event.attendanceSaved)}
                    className={`${fieldClass} font-mono disabled:bg-slate-50 disabled:text-slate-500`}
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
                    disabled={Boolean(event.attendanceSaved)}
                    className={`${fieldClass} font-mono disabled:bg-slate-50 disabled:text-slate-500`}
                  />
                </label>
                {event.attendanceSaved && (
                  <p className="sm:col-span-2 text-xs text-slate-600">
                    The sign-in window is locked because attendance has been saved.
                  </p>
                )}
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

            {event.attendanceUnavailable && (
              <div
                role="alert"
                className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm"
              >
                Attendance could not be saved. Run{" "}
                <span className="font-mono">migrations/special-event-attendance.sql</span>{" "}
                in the Supabase SQL editor, then refresh.
              </div>
            )}

            {event.attendanceSaved && !event.excusesApplied && (
              <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Enter excuses
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Attendance for this window is saved. Prefects on email leave
                    that covers this event are filled in below; edit the list
                    before saving. Prefects who signed in stay Present. Everyone
                    else named here is excused, and the rest are marked Traitor.
                  </p>
                </div>
                {canWrite ? (
                  <form onSubmit={handleExcuses} className="p-4 sm:p-6 flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-600">
                        Excused prefects
                      </span>
                      <textarea
                        value={excusedText}
                        onChange={(e) => {
                          excusesEdited.current = true;
                          setExcusedText(e.target.value);
                        }}
                        rows={8}
                        placeholder={"One code, full name, surname, or PIN per line\nCOD 01\nH. Perera"}
                        className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm text-slate-900 font-mono"
                      />
                    </label>
                    {excusePreview && (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-emerald-700">
                            {excusePreview.present} present
                          </span>
                          {" · "}
                          <span className="font-semibold text-sky-700">
                            {excusePreview.excused} excused
                          </span>
                          {" · "}
                          <span className="font-semibold text-red-600">
                            {excusePreview.traitors} traitor
                            {excusePreview.traitors !== 1 ? "s" : ""}
                          </span>
                        </p>
                        {excusePreview.unmatchedTokens.length > 0 && (
                          <p className="text-sm text-amber-800">
                            Not matched: {excusePreview.unmatchedTokens.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <button
                        type="submit"
                        disabled={applying}
                        className="min-h-11 px-5 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50"
                      >
                        {applying ? "Saving…" : "Save excuses"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="p-4 sm:p-6 text-sm text-slate-600">
                    An admin still needs to enter excuses before this becomes
                    the attendance record.
                  </p>
                )}
              </section>
            )}

            {event.excusesApplied && (
              <AttendanceBreakdown
                present={recordCounts.present}
                excused={recordCounts.excused}
                traitors={recordCounts.traitors}
                total={recordCounts.total}
              />
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

            {event.excusesApplied && (
              <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Prefects ({recordEntries.length}
                    {query.trim() ? ` of ${event.entries?.length || 0}` : ""})
                  </h2>
                </div>
                {recordEntries.length === 0 ? (
                  <p className="p-6 text-sm text-slate-600">
                    {query.trim()
                      ? "No prefects match this search."
                      : "No prefects on this record."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">
                            #
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">
                            Prefect
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recordEntries.map((row, idx) => {
                          const status = row.status || "Traitor";
                          const isTraitor = status === "Traitor";
                          const isExcused = isExcusedStatus(status);
                          return (
                            <tr
                              key={row.prefectId}
                              className={
                                isTraitor ? "bg-red-50/60" : undefined
                              }
                            >
                              <td className="px-4 py-3 font-mono text-slate-600 hidden sm:table-cell">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                      isTraitor
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {avatarChar(row.name)}
                                  </div>
                                  <div>
                                    <p
                                      className={`font-medium ${
                                        isTraitor
                                          ? "text-red-800"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {row.name}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {[row.code, row.class]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                      {status === "Present" && row.time
                                        ? ` · ${formatClock(row.time)}`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    isTraitor
                                      ? "bg-red-600 text-white border-red-700"
                                      : isExcused
                                        ? "bg-sky-100 text-sky-800 border-sky-200"
                                        : GATE_STATUS_STYLES[status] ||
                                          "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {isExcused ? "Excused" : status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {!event.excusesApplied && (
            <>
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Signed in ({present.length}
                  {query.trim() ? ` of ${event.present.length}` : ""})
                </h2>
              </div>
              {present.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">
                  {event.attendanceSaved
                    ? "No prefects scanned during this window."
                    : "No prefects have scanned during this window yet."}
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
          </>
        )}
      </main>
    </div>
  );
}
