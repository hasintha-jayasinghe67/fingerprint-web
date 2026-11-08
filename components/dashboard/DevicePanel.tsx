"use client";

import type { DeviceInfo } from "./attendanceStatus";

/** Devices that have polled the server, plus the command-queue reset. */
export function DevicePanel({
  devices,
  canWrite,
  clearingQueue,
  handleClearCommandQueue,
  queueFeedback,
}: {
  devices: DeviceInfo[];
  canWrite: boolean;
  clearingQueue: boolean;
  handleClearCommandQueue: () => void;
  queueFeedback: { ok: boolean; msg: string } | null;
}) {
  return (
    <>
        {/* Devices Section */}
        {(devices.length > 0 || canWrite) && (
          <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">
                Connected devices ({devices.length})
              </h3>
              {canWrite && (
                <button
                  type="button"
                  onClick={handleClearCommandQueue}
                  disabled={clearingQueue}
                  className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {clearingQueue ? "Clearing…" : "Clear command queue"}
                </button>
              )}
            </div>
            {queueFeedback && (
              <div
                role={queueFeedback.ok ? "status" : "alert"}
                className={`px-6 py-3 text-sm border-b ${
                  queueFeedback.ok
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-red-50 border-red-100 text-red-700"
                }`}
              >
                {queueFeedback.msg}
              </div>
            )}
            <div className="p-6">
              {devices.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No device has polled yet. Clearing the queue still drops any
                  commands waiting in memory.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map((device) => (
                    <div
                      key={device.serialNumber}
                      className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-sm font-medium text-slate-700">
                          ZKTeco K40 Pro
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <p>
                          <span className="font-medium">Serial:</span>{" "}
                          <span className="font-mono">
                            {device.serialNumber}
                          </span>
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
              )}
            </div>
          </div>
        )}

    </>
  );
}
