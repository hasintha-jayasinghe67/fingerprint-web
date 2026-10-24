"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiUrl, readApiJson } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import AttendanceBreakdown from "@/components/AttendanceBreakdown";
import GeneralAttendanceForm, {
  type GeneralPrefectEntry,
} from "../GeneralAttendanceForm";
import { formatDateDisplay, isExcusedStatus } from "../helpers";

interface GeneralAttendanceRecord {
  id: number;
  name: string;
  date: string;
  entries: GeneralPrefectEntry[];
}

export default function GeneralAttendanceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [recordName, setRecordName] = useState("");
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState<GeneralPrefectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const savedStatuses = useRef(new Map<number, string>());

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setSaveNotice(null);

      const res = await fetch(apiUrl(`/api/general-attendance/${id}`));
      const data = await readApiJson<GeneralAttendanceRecord & { error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error(data.error || "Failed to load record");
      }
      setRecordName(data.name);
      setDate(data.date);
      setEntries(data.entries || []);
      savedStatuses.current = new Map(
        (data.entries || []).map((entry) => [entry.prefectId, entry.status])
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    let present = 0;
    let excused = 0;
    let traitors = 0;
    for (const entry of entries) {
      if (entry.status === "Present") {
        present += 1;
      } else if (isExcusedStatus(entry.status)) {
        excused += 1;
      } else if (entry.status === "Traitor") {
        traitors += 1;
      }
    }
    return {
      present,
      excused,
      traitors,
      total: entries.length,
    };
  }, [entries]);

  function handleStatusChange(prefectId: number, status: string) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.prefectId === prefectId ? { ...entry, status } : entry
      )
    );
  }

  async function handleSubmit(
    e: React.FormEvent,
    overrideEntries?: GeneralPrefectEntry[]
  ) {
    e.preventDefault();
    if (!id) return;
    const listToSave = overrideEntries ?? entries;
    const changed = listToSave.filter(
      (entry) => savedStatuses.current.get(entry.prefectId) !== entry.status
    );
    setSubmitting(true);
    setError(null);
    setSaveNotice(null);
    try {
      const res = await fetch(apiUrl(`/api/general-attendance/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recordName.trim(),
          date,
          entries: changed.map((entry) => ({
            prefectId: entry.prefectId,
            status: entry.status,
          })),
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to save record");
      }
      if (overrideEntries) {
        setEntries(overrideEntries);
      }
      for (const entry of listToSave) {
        savedStatuses.current.set(entry.prefectId, entry.status);
      }
      setSaveNotice("Attendance saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        title={recordName || "General Attendance"}
        subtitle={date ? formatDateDisplay(date) : "Special or off-site duty"}
        backTo="/attendance/general"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading record...</p>
            </div>
          </div>
        )}

        {!loading && error && entries.length === 0 && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && (entries.length > 0 || recordName) && (
          <>
            {saveNotice && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
                {saveNotice}
              </div>
            )}

            <div className="mb-6">
              <AttendanceBreakdown
                present={counts.present}
                excused={counts.excused}
                traitors={counts.traitors}
                total={counts.total}
              />
            </div>

            <GeneralAttendanceForm
              name={recordName}
              date={date}
              entries={entries}
              canWrite={canWrite}
              submitting={submitting}
              error={error}
              submitLabel="Save attendance"
              cancelHref="/attendance/general"
              onNameChange={setRecordName}
              onDateChange={setDate}
              onStatusChange={handleStatusChange}
              onEntriesChange={setEntries}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </main>
    </div>
  );
}

