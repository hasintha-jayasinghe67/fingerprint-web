"use client";

import { useState, type ReactNode } from "react";
import { IconCheck } from "@/components/icons";
import { formatDutyDate } from "./format";
import type { TieDutyMember } from "./types";
import { SuspendedBadge } from "./SuspendedBadge";

/** navigator.clipboard needs a secure context (HTTPS / localhost). */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("Copy failed");
}

export function AssignedList({
  members,
  dutyDate,
  title,
  draft = false,
  footer,
}: {
  members: TieDutyMember[];
  dutyDate: string;
  title: string;
  /** Unsaved preview: no Copy button, amber styling. */
  draft?: boolean;
  footer?: ReactNode;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const codes = members
    .filter((m) => m.code)
    .map((m) => ({ label: m.code!, suspended: !!m.wasSuspended }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const names = members
    .filter((m) => !m.code)
    .map((m) => ({ label: m.name, suspended: !!m.wasSuspended }));
  const groups = [
    { title: "Codes", items: codes },
    { title: "Names", items: names },
  ].filter((g) => g.items.length > 0);

  async function handleCopy() {
    try {
      await copyText(
        groups.map((g) => g.items.map((i) => i.label).join("\n")).join("\n\n")
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border overflow-hidden ${draft ? "border-amber-300" : "border-brand-300"}`}
    >
      <div
        className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${draft ? "bg-amber-50/60" : ""}`}
      >
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDutyDate(dutyDate)}</p>
        </div>
        {!draft && (
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
            copyState === "copied"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : copyState === "failed"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {copyState === "copied" && <IconCheck className="w-3 h-3" />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </button>
        )}
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
            {group.title} ({group.items.length})
          </p>
          <ol className="divide-y divide-slate-100">
            {group.items.map((item, idx) => (
              <li key={`${item.label}-${idx}`} className="px-6 py-2.5 flex items-center gap-3 text-sm">
                <span className="w-6 text-right text-slate-600 font-mono">{idx + 1}.</span>
                <span className={`text-slate-800 ${group.title === "Codes" ? "font-mono" : ""}`}>
                  {item.label}
                </span>
                {item.suspended && <SuspendedBadge />}
              </li>
            ))}
          </ol>
        </div>
      ))}
      {footer}
    </div>
  );
}

