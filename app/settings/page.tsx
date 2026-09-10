"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { IconCheck } from "@/components/icons";

interface BatchSetting {
  id: number;
  name: string;
  morningSigninTime: string;
  extended: boolean;
}

function format12(hhmm: string): string {
  const [h, m] = (hhmm || "07:30").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<BatchSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = isAdminOrAbove(user);

  useEffect(() => {
    if (authenticated && !canWrite) {
      router.push("/");
    }
  }, [authenticated, canWrite, router]);

  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"));
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        if (!cancelled) {
          setBatches(data.settings?.batches || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  function updateTime(id: number, morningSigninTime: string) {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, morningSigninTime } : b))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batches: batches.map((b) => ({
            id: b.id,
            morningSigninTime: b.morningSigninTime,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setBatches(data.settings?.batches || batches);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!authenticated || !canWrite) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader title="Settings" backTo="back" maxWidth="3xl" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 mb-1">
            Batch morning sign-in times
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Each batch has its own morning deadline. Prefects on gate duty (or
            in an <strong>Extended</strong> batch) are late after their batch
            time. Everyone else — including prefects with no batch — is late
            after <strong>7:00 AM</strong>. Times are re-evaluated on each read;
            existing scans are not rewritten.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
              <p className="text-sm text-slate-600 mb-3">
                No batches yet. Create a batch to set morning sign-in times.
              </p>
              <Link
                href="/batches/add"
                className="inline-flex px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                + Add Batch
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-4 mb-6">
                {batches.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-end gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="min-w-[10rem] flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {b.name}
                      </p>
                      {b.extended && (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Extended — deadline applies even without gate duty
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`time-${b.id}`}
                        className="block text-xs font-medium text-slate-500 mb-1"
                      >
                        Sign-in time
                      </label>
                      <input
                        id={`time-${b.id}`}
                        type="time"
                        value={b.morningSigninTime}
                        onChange={(e) => updateTime(b.id, e.target.value)}
                        className="px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      />
                    </div>
                    <div className="text-sm text-slate-500 pb-2">
                      ={" "}
                      <span className="font-semibold text-slate-700">
                        {format12(b.morningSigninTime || "07:30")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save times"}
                </button>
                <Link
                  href="/batches"
                  className="text-sm text-brand-700 font-medium hover:underline"
                >
                  Manage batches
                </Link>
              </div>

              {saved && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700 inline-flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5" />
                  Batch morning sign-in times saved.
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 bg-brand-50 border border-brand-200 rounded-lg p-5">
          <h3 className="font-semibold text-brand-900 text-sm mb-2">
            The three daily sign-ins
          </h3>
          <ul className="text-sm text-brand-800 space-y-1.5 list-disc list-inside">
            <li>
              <strong>Morning sign-in</strong> — batch members on gate duty (or
              Extended) late after their batch time; everyone else late after
              7:00 AM.
            </li>
            <li>
              <strong>11:15 sign-in</strong> — anyone who scans at or after
              11:00 AM counts under the 11:15 sign-in.
            </li>
            <li>
              <strong>1:30 sign-in</strong> — anyone who scans at or after
              1:20 PM counts under the 1:30 sign-in.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
