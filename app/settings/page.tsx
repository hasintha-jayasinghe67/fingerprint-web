"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import SiteHeader from "@/components/site-header";

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [morningSigninTime, setMorningSigninTime] = useState("07:30");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <SiteHeader title="Settings" backTo="back" maxWidth="3xl" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-lg font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>

              {saved && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  ✓ Morning sign-in time saved as{" "}
                  <strong>{format12(morningSigninTime)}</strong>.
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <h3 className="font-semibold text-indigo-800 text-sm mb-2">
            The three daily sign-ins
          </h3>
          <ul className="text-sm text-indigo-700 space-y-1.5 list-disc list-inside">
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
