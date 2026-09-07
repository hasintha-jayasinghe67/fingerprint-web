"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import { IconCheck } from "@/components/icons";

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const { authenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [morningSigninTime, setMorningSigninTime] = useState("07:30");
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
          setMorningSigninTime(data.settings?.morningSigninTime || "07:30");
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

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ morningSigninTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function format12(hhmm: string): string {
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  }

  if (!authenticated || !canWrite) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader title="Settings" backTo="back" maxWidth="3xl" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 mb-1">
            Morning Sign-in Time
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            The time house prefects are expected to do their first (morning)
            sign-in of the day. Anyone who scans their fingerprint after this
            time is flagged as a <strong>latecomer</strong> in the attendance
            records. This value changes often, so it can be updated here any
            time — existing records are re-evaluated against the current time.
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
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4 mb-2">
                <div>
                  <label
                    htmlFor="morningSigninTime"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Expected morning sign-in time
                  </label>
                  <input
                    id="morningSigninTime"
                    type="time"
                    value={morningSigninTime}
                    onChange={(e) => {
                      setMorningSigninTime(e.target.value);
                      setSaved(false);
                    }}
                    className="px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-lg font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="text-sm text-slate-500 pb-2.5">
                  ={" "}
                  <span className="font-semibold text-slate-700">
                    {format12(morningSigninTime || "07:30")}
                  </span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>

              {saved && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700 inline-flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5" />
                  Morning sign-in time saved as{" "}
                  <strong>{format12(morningSigninTime)}</strong>.
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-brand-50 border border-brand-200 rounded-lg p-5">
          <h3 className="font-semibold text-brand-900 text-sm mb-2">
            The three daily sign-ins
          </h3>
          <ul className="text-sm text-brand-800 space-y-1.5 list-disc list-inside">
            <li>
              <strong>Morning sign-in</strong> — expected at your configured
              time. Latecomers are anyone who scans after it.
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
