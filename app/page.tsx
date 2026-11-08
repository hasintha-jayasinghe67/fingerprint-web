"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { peekQuery, rememberQuery, useQuery } from "@/lib/useQuery";
import {
  formatClock,
  formatColomboNow,
  formatDateDisplay,
  getTodaySriLankanDateISO,
} from "@/lib/time";
import { useAuth, isAdminOrAbove } from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import Modal from "@/components/Modal";
import { DevicePanel } from "@/components/dashboard/DevicePanel";
import { LiveLog } from "@/components/dashboard/LiveLog";
import { PresenceDonut } from "@/components/dashboard/PresenceDonut";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  eventIsLate,
  getStatusLabel,
  isMorningLate,
  type AttendanceEvent,
  type DeviceInfo,
} from "@/components/dashboard/attendanceStatus";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { PageSkeleton, RefreshBar } from "@/components/ui/Skeleton";
import { IconCheck } from "@/components/icons";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AttendancePage() {
  const { user } = useAuth();
  const canWrite = isAdminOrAbove(user);
  const todayISO = getTodaySriLankanDateISO();

  // Attendance and the device list arrive together. Class and code
  // ride on each event, so this page no longer waits on /api/prefects.
  const live = useQuery(`live:${todayISO}`, async () => {
    const [attRes, devRes] = await Promise.all([
      fetch(apiUrl(`/api/attendance?date=${todayISO}`)),
      fetch(apiUrl("/api/devices")),
    ]);
    if (!attRes.ok) throw new Error("Failed to fetch attendance");
    if (!devRes.ok) throw new Error("Failed to fetch devices");
    const attData = await attRes.json();
    const devData = await devRes.json();
    const nextEvents = (Array.isArray(attData.events) ? attData.events : [])
      .slice()
      .sort((a: AttendanceEvent, b: AttendanceEvent) =>
        a.timestamp.localeCompare(b.timestamp)
      ) as AttendanceEvent[];
    return {
      events: nextEvents,
      devices: (devData.devices || []) as DeviceInfo[],
      prefectCount:
        typeof attData.prefectCount === "number"
          ? attData.prefectCount
          : nextEvents.length,
    };
  });

  const [events, setEvents] = useState<AttendanceEvent[]>(live.data?.events ?? []);
  const [totalPrefects, setTotalPrefects] = useState<number>(live.data?.prefectCount ?? 0);
  const [devices, setDevices] = useState<DeviceInfo[]>(live.data?.devices ?? []);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [serverTime, setServerTime] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const loading = live.loading;
  const error = live.error;

  // Notice / SMS dialog state
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeSending, setNoticeSending] = useState(false);
  const [noticeResult, setNoticeResult] = useState<string | null>(null);

  const [clearingQueue, setClearingQueue] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [showLatecomers, setShowLatecomers] = useState(false);
  const [query, setQuery] = useState("");
  const [excusingPin, setExcusingPin] = useState<string | null>(null);
  const [excuseError, setExcuseError] = useState<string | null>(null);

  useEffect(() => {
    if (!live.data) return;
    setEvents(live.data.events);
    setDevices(live.data.devices);
    setTotalPrefects(live.data.prefectCount);
    setLastRefresh(new Date());
  }, [live.data]);

  // The clock ticks on its own. Reloading attendance does not reset it.
  useEffect(() => {
    const tick = () => setServerTime(formatColomboNow());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Warm the dates list so opening Attendance feels instant.
  useEffect(() => {
    const key = apiUrl("/api/attendance/dates");
    if (peekQuery(key)) return;
    fetch(key)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) rememberQuery(key, data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void live.reload();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, live.reload]);

  async function handleClearCommandQueue() {
    if (
      !window.confirm(
        "Clear all pending ZKTeco command-queue actions (enroll, updates, SMS, etc.)? Commands already sent to the device are not cancelled."
      )
    ) {
      return;
    }
    setClearingQueue(true);
    setQueueFeedback(null);
    try {
      const res = await fetch(apiUrl("/api/devices/clear-command-queue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setQueueFeedback({
        ok: res.ok,
        msg: res.ok
          ? data.message || "Command queue cleared."
          : data.error || "Failed to clear command queue",
      });
    } catch {
      setQueueFeedback({ ok: false, msg: "Network error" });
    } finally {
      setClearingQueue(false);
    }
  }

  async function handleLateExcusal(event: AttendanceEvent, excuse: boolean) {
    const date = event.timestamp.split(" ")[0];
    setExcusingPin(event.pin);
    setExcuseError(null);
    try {
      const res = excuse
        ? await fetch(apiUrl("/api/late-excusals"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: event.pin, date }),
          })
        : await fetch(
            apiUrl(
              `/api/late-excusals?pin=${encodeURIComponent(event.pin)}&date=${date}`
            ),
            { method: "DELETE" }
          );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update late status");
      setEvents((prev) =>
        prev.map((e) =>
          e.pin === event.pin &&
          e.timestamp.startsWith(date) &&
          (excuse ? e.late : e.lateExcused)
            ? { ...e, late: !excuse, lateExcused: excuse }
            : e
        )
      );
    } catch (err) {
      setExcuseError(err instanceof Error ? err.message : "Network error");
    } finally {
      setExcusingPin(null);
    }
  }

  // Unique prefects who signed in today
  const prefectCount = new Set(events.map((e) => e.pin)).size;

  // Single reader: online if it polled within the last 90s
  const device = devices[0] ?? null;
  const deviceOnline = device
    ? Date.now() - new Date(device.lastSeen).getTime() < 90_000
    : false;

  const latecomerCount = events.filter(eventIsLate).length;
  const displayedEvents = useMemo(() => {
    const base = showLatecomers
      ? events.filter(
          (event) =>
            event.late ??
            isMorningLate(event.timestamp.split(" ")[1] || "")
        )
      : events;
    return base.filter((event) => {
      const late =
        event.late ?? isMorningLate(event.timestamp.split(" ")[1] || "");
      return matchesSearch(
        query,
        event.name,
        event.pin,
        event.class,
        event.code,
        getStatusLabel(event.status),
        formatClock(event.timestamp),
        late ? "Late" : "",
        event.lateExcused ? "Late excused" : "",
        event.verifyMethod,
        event.deviceSN
      );
    });
  }, [events, showLatecomers, query]);

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="House Prefect Affairs"
        actions={
          <>
            <div className="hidden md:block text-right shrink-0">
              <p className="text-xs text-slate-600">SL time</p>
              <p className="text-sm font-mono font-medium text-slate-700">
                {serverTime || "--:--:-- --"}
              </p>
            </div>
            <div
              className={`min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border ${
                deviceOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
              title={
                device
                  ? `Last seen ${new Date(device.lastSeen).toLocaleTimeString("en-US", {
                      timeZone: "Asia/Colombo",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}`
                  : "No device has contacted the server yet"
              }
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                  deviceOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              Device {deviceOnline ? "online" : "offline"}
            </div>
            {canWrite && (
              <Link
                href="/prefects/add"
                className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors"
              >
                + Add
              </Link>
            )}
            {/* Send Notice — temporarily disabled
            {canWrite && (
              <button
                onClick={() => {
                  setNoticeOpen(true);
                  setNoticeResult(null);
                  setNoticeMessage("");
                }}
                className={navLinkClass}
              >
                Send Notice
              </button>
            )}
            */}
            <button
              type="button"
              aria-pressed={autoRefresh}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                autoRefresh
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${
                  autoRefresh ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              Auto-refresh {autoRefresh ? "on" : "off"}
            </button>
            <RefreshButton onClick={() => { void live.reload(); }} />
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Banner */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {formatDateDisplay(todayISO)}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Today&apos;s attendance records
          </p>
        </div>

        <RefreshBar active={live.refreshing} />

        {error && (
          <ErrorBanner>
            {error} — Make sure the ADMS server is running on port 8088.
          </ErrorBanner>
        )}

        {loading && events.length === 0 ? (
          <PageSkeleton variant="table" label="Loading today's attendance" />
        ) : (
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-[minmax(0,20rem)_minmax(0,24rem)] gap-4">
          <StatCard label="Number of prefects" value={prefectCount} />
          <PresenceDonut present={prefectCount} total={totalPrefects} />
        </div>
        )}

        {/* No records */}
        {!loading && !error && events.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
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

        <LiveLog
          events={events}
          displayedEvents={displayedEvents}
          query={query}
          setQuery={setQuery}
          showLatecomers={showLatecomers}
          setShowLatecomers={setShowLatecomers}
          latecomerCount={latecomerCount}
          lastRefresh={lastRefresh}
          excuseError={excuseError}
          setExcuseError={setExcuseError}
          canWrite={canWrite}
          excusingPin={excusingPin}
          handleLateExcusal={handleLateExcusal}
        />

        <DevicePanel
          devices={devices}
          canWrite={canWrite}
          clearingQueue={clearingQueue}
          handleClearCommandQueue={handleClearCommandQueue}
          queueFeedback={queueFeedback}
        />

        <Modal
          isOpen={noticeOpen}
          dismissible={!noticeSending}
          onClose={() => {
            if (!noticeSending) setNoticeOpen(false);
          }}
          title="Send notice to device"
        >
          <p className="text-xs text-slate-600">
            This message will be displayed on the ZKTeco device screen.
          </p>
          {noticeResult ? (
            <div className="text-center py-2" role="status">
              <div className="flex justify-center mb-3 text-emerald-700">
                <IconCheck className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-slate-700">{noticeResult}</p>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="mt-4 min-h-11 px-4 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="notice-message" className="block text-sm font-medium text-slate-700 mb-2">
                  Notice content
                </label>
                <textarea
                  id="notice-message"
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="Enter the message to display on the device..."
                  rows={4}
                  disabled={noticeSending}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-slate-800 placeholder:text-slate-600 resize-none disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setNoticeOpen(false)}
                  disabled={noticeSending}
                  className="min-h-11 px-4 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
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
                  className="min-h-11 px-4 rounded-md text-sm font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {noticeSending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      Sending...
                    </span>
                  ) : (
                    "Send notice"
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Device Setup Instructions */}
        <div className="mt-8 bg-brand-50 border border-brand-200 rounded-lg p-6">
          <h3 className="font-semibold text-brand-900 mb-3">
            ZKTeco K40 Pro — ADMS setup
          </h3>
          <div className="text-sm text-brand-800 space-y-1.5">
            <p>
              On the device, go to:{" "}
              <strong>Menu → Comm → ADMS</strong> and set:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                <strong>Server URL:</strong>{" "}
                <code className="bg-white px-1.5 py-0.5 rounded font-mono text-xs">
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
