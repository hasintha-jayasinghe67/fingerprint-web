import type { TieDuty } from "./types";

export function todaySriLankan(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

/** "2026-10-05" → "Monday, October 5, 2026" */
export function formatDutyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function sortDuties(list: TieDuty[]): TieDuty[] {
  return [...list].sort(
    (a, b) =>
      b.dutyDate.localeCompare(a.dutyDate) || b.createdAt.localeCompare(a.createdAt)
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
