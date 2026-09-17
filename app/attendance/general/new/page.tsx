"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, readApiJson } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { DEFAULT_GATE_STATUS } from "@/lib/gateStatuses";
import GeneralAttendanceForm, {
  type GeneralPrefectEntry,
} from "../GeneralAttendanceForm";
import { getTodaySriLankanDateISO } from "../helpers";

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
}

export default function NewGeneralAttendancePage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const canWrite = isAdminOrAbove(user);

  const [name, setName] = useState("");
  const [date, setDate] = useState(getTodaySriLankanDateISO);
  const [entries, setEntries] = useState<GeneralPrefectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && !canWrite) {
      router.push("/attendance/general");
    }
  }, [authenticated, canWrite, router]);

  const fetchPrefects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl("/api/prefects"));
      const data = await readApiJson<{ prefects?: Prefect[]; error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error(data.error || "Failed to load prefects");
      }
      setEntries(
        (data.prefects || []).map((p) => ({
          prefectId: p.id,
          pin: p.pin,
          name: p.name,
          class: p.class || null,
          code: p.code || null,
          status: DEFAULT_GATE_STATUS,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    fetchPrefects();
  }, [canWrite, fetchPrefects]);

  function handleStatusChange(prefectId: number, status: string) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.prefectId === prefectId ? { ...entry, status } : entry
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/general-attendance"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          entries: entries.map((entry) => ({
            prefectId: entry.prefectId,
            status: entry.status,
          })),
        }),
      });
      const data = await readApiJson<{ id?: number; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to create record");
      }
      router.push(`/attendance/general/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authenticated || !canWrite) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="New General Attendance"
        subtitle="Special or off-site duty"
        backTo="/attendance/general"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading prefects...</p>
            </div>
          </div>
        ) : (
          <GeneralAttendanceForm
            name={name}
            date={date}
            entries={entries}
            canWrite={canWrite}
            submitting={submitting}
            error={error}
            submitLabel="Save attendance"
            cancelHref="/attendance/general"
            onNameChange={setName}
            onDateChange={setDate}
            onStatusChange={handleStatusChange}
            onSubmit={handleSubmit}
          />
        )}
      </main>
    </div>
  );
}
