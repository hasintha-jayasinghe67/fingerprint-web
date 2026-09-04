"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import SiteHeader from "@/components/site-header";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface AttendanceEvent {
  pin: string;
  name: string | null;
  timestamp: string;
  status: string;
  verifyMode: string;
  verifyMethod: string;
  workCode: string | null;
  deviceSN: string;
}

interface DeviceInfo {
  serialNumber: string;
  lastSeen: string;
  ip: string | null;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * The K40 Pro sends timestamps already in Sri Lankan time (UTC+5:30)
 * as confirmed by the ADMS handshake TimeZone=5.5.
 * Format: "2026-08-30 18:06:47"
 *
 * We parse them directly — no timezone offset gymnastics needed.
 */

function toSriLankanTime(timestamp: string): string {
  const timePart = timestamp.split(" ")[1];
  if (!timePart) return timestamp;
  const [h, m, s] = timePart.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period}`;
}

function toSriLankanDate(timestamp: string): string {
  const datePart = timestamp.split(" ")[0]?.split("T")[0];
  if (!datePart) return timestamp;
  const [y, m, d] = datePart.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodaySriLankanDateISO(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const slMs = utcMs + 5.5 * 3600000;
  const slDate = new Date(slMs);
  const y = slDate.getFullYear();
  const m = String(slDate.getMonth() + 1).padStart(2, "0");
  const d = String(slDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "0":
      return "Check In";
    case "1":
      return "Check Out";
    case "2":
      return "Break Out";
    case "3":
      return "Break In";
    case "4":
      return "Overtime In";
    case "5":
      return "Overtime Out";
    default:
      return `Status ${status}`;
  }
}

/**
 * A scan counts as a late MORNING sign-in when its time falls inside the
 * morning slot (before 11:00) but after the configured morning sign-in time.
 */
function isMorningLate(timePart: string, morningSigninTime: string): boolean {
  if (!timePart) return false;
  const t = timePart.length === 5 ? `${timePart}:00` : timePart;
  const threshold = morningSigninTime.length === 5 ? `${morningSigninTime}:00` : morningSigninTime;
  return t < "11:00:00" && t > threshold;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "0":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "1":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "2":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "3":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getVerifyLabel(method: string): string {
  if (method.includes("Fingerprint")) return "Fingerprint";
  if (method.includes("Card")) return "Card";
  if (method.includes("Face")) return "Face";
  if (method.includes("Password")) return "Password";
  return method;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AttendancePage() {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [serverTime, setServerTime] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [morningSigninTime, setMorningSigninTime] = useState<string>("07:30");

  // Notice / SMS dialog state
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeSending, setNoticeSending] = useState(false);
  const [noticeResult, setNoticeResult] = useState<string | null>(null);

  const todayISO = getTodaySriLankanDateISO();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [attRes, devRes, setRes] = await Promise.all([
        fetch(apiUrl(`/api/attendance?date=${todayISO}`)),
        fetch(apiUrl("/api/devices")),
        fetch(apiUrl("/api/settings")),
      ]);

      if (!attRes.ok) throw new Error("Failed to fetch attendance");
      if (!devRes.ok) throw new Error("Failed to fetch devices");
      if (!setRes.ok) throw new Error("Failed to fetch settings");

      const attData = await attRes.json();
      const devData = await devRes.json();
      const setData = await setRes.json();

      if (setData.settings?.morningSigninTime) {
        setMorningSigninTime(setData.settings.morningSigninTime);
      }

      // Sort by timestamp ascending
      const sorted = attData.events.sort(
        (a: AttendanceEvent, b: AttendanceEvent) =>
          a.timestamp.localeCompare(b.timestamp)
      );

      setEvents(sorted);
      setDevices(devData.devices);
      setLastRefresh(new Date());
      setServerTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Colombo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [todayISO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Stats
  const totalRecords = events.length;
  const uniqueUsers = new Set(events.map((e) => e.pin)).size;
  const checkIns = events.filter((e) => e.status === "0").length;
  const checkOuts = events.filter((e) => e.status === "1").length;
  const deviceConnected = devices.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <SiteHeader
        title="House Prefect Affairs"
        actions={
          <>
            <div className="hidden md:block text-right shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Sri Lanka Time
              </p>
              <p className="text-sm font-mono font-semibold text-slate-700">
                {serverTime || "--:--:-- --"}
              </p>
            </div>
            <Link
              href="/attendance"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 transition-all active:scale-95"
            >
              Attendance
            </Link>
            <Link
              href="/prefects"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-all active:scale-95"
            >
              Prefects
            </Link>
            <Link
              href="/gate-sheet"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
            >
              Gate Sheet
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
            >
              ⚙ Settings
            </Link>
            <Link
              href="/prefects/add"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all active:scale-95"
            >
              + Add
            </Link>
            <button
              onClick={() => {
                setNoticeOpen(true);
                setNoticeResult(null);
                setNoticeMessage("");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-all active:scale-95"
            >
              Send Notice
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                autoRefresh
                  ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              {autoRefresh ? "● Auto-refresh ON" : "○ Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
            >
              ↻ Refresh
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Banner */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            {toSriLankanDate(
              new Date().toISOString().replace("Z", "+0530")
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Today&apos;s Attendance Records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">            <StatCard
            label="Total Records"
            value={totalRecords}
            color="bg-white"
          />
          <StatCard
            label="Unique Users"
            value={uniqueUsers}
            color="bg-white"
          />
          <StatCard
            label="Check Ins"
            value={checkIns}
            color="bg-white"
          />
          <StatCard
            label="Check Outs"
            value={checkOuts}
            color="bg-white"
          />
          <StatCard
            label="Devices Online"
            value={deviceConnected}
            color="bg-white"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Error:</strong> {error} — Make sure the ADMS server is
            running on port 8088.
          </div>
        )}

        {/* Loading */}
        {loading && events.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">
                Loading attendance data...
              </p>
            </div>
          </div>
        )}

        {/* No records */}
        {!loading && !error && events.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-5xl text-slate-300">—</div>
              <h3 className="text-lg font-semibold text-slate-700">
                No attendance records today
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                Waiting for the ZKTeco K40 Pro to push fingerprint scans.
                Make sure the device is configured with server URL{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
                  http://&lt;this-server&gt;:8088/iclock/cdata
                </code>
              </p>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-800">
                Attendance Log ({events.length} records)
              </h3>
              {lastRefresh && (
                <p className="text-xs text-slate-400">
                  Last updated:{" "}
                  {lastRefresh.toLocaleTimeString("en-US", {
                    timeZone: "Asia/Colombo",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Time (SL)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Device SN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event, idx) => (
                    <tr
                      key={`${event.pin}-${event.timestamp}-${idx}`}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm text-slate-400 font-mono hidden md:table-cell">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {event.name
                              ? event.name.charAt(0).toUpperCase()
                              : event.pin.slice(-2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {event.name || `User ${event.pin}`}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              PIN: {event.pin}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-slate-700">
                            {toSriLankanTime(event.timestamp)}
                          </span>
                          {isMorningLate(
                            event.timestamp.split(" ")[1] || "",
                            morningSigninTime
                          ) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                              LATE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(event.status)}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          {getVerifyLabel(event.verifyMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-mono hidden lg:table-cell">
                        {event.deviceSN}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices Section */}
        {devices.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                Connected Devices ({devices.length})
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                  <div
                    key={device.serialNumber}
                    className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-semibold text-slate-700">
                        ZKTeco K40 Pro
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <p>
                        <span className="font-medium">Serial:</span>{" "}
                        <span className="font-mono">{device.serialNumber}</span>
                      </p>
                      {device.ip && (
                        <p>
                          <span className="font-medium">IP:</span>{" "}
                          <span className="font-mono">{device.ip}</span>
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Last seen:</span>{" "}
                        {new Date(device.lastSeen).toLocaleString("en-US", {
                          timeZone: "Asia/Colombo",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Send Notice Dialog */}
        {noticeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !noticeSending && setNoticeOpen(false)}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">
                      Send Notice to Device
                    </h3>
                  </div>
                  <button
                    onClick={() => !noticeSending && setNoticeOpen(false)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This message will be displayed on the ZKTeco device screen.
                </p>
              </div>

              <div className="px-6 py-4">
                {noticeResult ? (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2 text-emerald-500">✓</div>
                    <p className="text-sm font-medium text-slate-700">
                      {noticeResult}
                    </p>
                    <button
                      onClick={() => setNoticeOpen(false)}
                      className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notice Content
                    </label>
                    <textarea
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      placeholder="Enter the message to display on the device..."
                      rows={4}
                      disabled={noticeSending}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => setNoticeOpen(false)}
                        disabled={noticeSending}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!noticeMessage.trim()) return;
                          setNoticeSending(true);
                          try {
                            const res = await fetch(apiUrl("/api/sms"), {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ message: noticeMessage.trim() }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setNoticeResult(
                                `Notice sent to device ${data.deviceSN}. The device will display it on its next poll.`
                              );
                            } else {
                              setNoticeResult(
                                `Failed: ${data.error || "Unknown error"}`
                              );
                            }
                          } catch (err) {
                            setNoticeResult(
                              `Error: ${err instanceof Error ? err.message : "Network error"}`
                            );
                          } finally {
                            setNoticeSending(false);
                          }
                        }}
                        disabled={!noticeMessage.trim() || noticeSending}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {noticeSending ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          "Send Notice"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Device Setup Instructions */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-800 mb-3">
            ZKTeco K40 Pro — ADMS Setup
          </h3>
          <div className="text-sm text-amber-700 space-y-1.5">
            <p>
              On the device, go to:{" "}
              <strong>Menu → Comm → ADMS</strong> and set:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                <strong>Server URL:</strong>{" "}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">
                  http://&lt;server-ip&gt;:8088/iclock/cdata
                </code>
              </li>
              <li>
                <strong>TransInterval:</strong> 1 (real-time push)
              </li>
              <li>
                The device will automatically register and push attendance logs
                via HTTP POST to the ADMS endpoints.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

// -------------------------------------------------------
// Stat Card Component
// -------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`${color} rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
  );
}
