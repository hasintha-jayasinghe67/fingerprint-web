"use client";

import { categoryLabel } from "@/lib/auditLabels";
import type { AuditLog } from "./types";
import { categoryChipClass, formatWhen, prettyJson } from "./format";

export function LogRow({
  log,
  open,
  onToggle,
}: {
  log: AuditLog;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={open ? "bg-slate-50/80" : "hover:bg-slate-50/50"}>
        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
          {formatWhen(log.created_at)}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">
            {log.actor_username || "(unknown)"}
          </p>
          <p className="text-xs text-slate-600">{log.actor_role || "—"}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-slate-900">{log.summary}</p>
          <p className="text-xs font-mono text-slate-600 truncate max-w-[28rem]">
            {log.method} {log.path}
          </p>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${categoryChipClass(log.category)}`}
          >
            {categoryLabel(log.category)}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              log.success
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {log.success ? `OK ${log.status_code ?? ""}`.trim() : `Failed ${log.status_code ?? ""}`.trim()}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="min-h-11 px-3 py-1.5 rounded-md text-sm font-medium text-brand-800 hover:bg-brand-50"
          >
            {open ? "Hide" : "Raw"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
              <div>
                <dt className="text-xs font-medium text-slate-600">Action</dt>
                <dd className="font-mono text-slate-800 break-all">{log.action}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Path</dt>
                <dd className="font-mono text-slate-800 break-all">
                  {log.method} {log.path || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">IP</dt>
                <dd className="font-mono text-slate-800">{log.ip || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Location</dt>
                <dd className="text-slate-800">{log.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">User agent</dt>
                <dd className="text-slate-800 break-all">{log.user_agent || "—"}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">
                  Request body
                </p>
                <pre className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md p-3 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {prettyJson(log.request_body)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">
                  Response body
                </p>
                <pre className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md p-3 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {prettyJson(log.response_body)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
