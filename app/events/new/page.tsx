"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, readApiJson } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import {
  fromDatetimeLocal,
  getDefaultEventDatetimes,
} from "../helpers";

const fieldClass =
  "w-full min-h-11 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900";

export default function NewEventPage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const canWrite = isAdminOrAbove(user);
  const defaults = getDefaultEventDatetimes();

  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState(defaults.start);
  const [endAt, setEndAt] = useState(defaults.end);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && !canWrite) {
      router.push("/events");
    }
  }, [authenticated, canWrite, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/special-events"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startAt: fromDatetimeLocal(startAt),
          endAt: fromDatetimeLocal(endAt),
        }),
      });
      const data = await readApiJson<{ id?: number; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }
      router.push(`/events/${data.id}`);
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
        title="New Event"
        subtitle="Set a fingerprint sign-in window"
        backTo="/events"
        maxWidth="3xl"
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col gap-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600">
            Prefects who scan during this window are marked present for this
            event. Those scans do not appear on daily attendance.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="House meeting, assembly…"
              className={fieldClass}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="min-h-11 px-5 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create event"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/events")}
              className="min-h-11 px-4 py-2 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
