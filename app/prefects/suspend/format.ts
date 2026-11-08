import type { Suspension } from "./types";

export const inputClass =
  "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm transition-colors";

/** "2026-10-05" → "Oct 5, 2026" */
export function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRange(s: Suspension): string {
  return s.endDate
    ? `${formatDate(s.startDate)} – ${formatDate(s.endDate)}`
    : `From ${formatDate(s.startDate)} (ongoing)`;
}

export function isActiveOn(s: Suspension, date: string): boolean {
  return s.startDate <= date && (s.endDate === null || s.endDate >= date);
}

/** Inclusive day count between two 'YYYY-MM-DD' dates. */
export function durationDays(start: string, end: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1;
}

