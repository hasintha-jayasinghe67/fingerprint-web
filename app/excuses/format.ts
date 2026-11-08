import type { ExcuseType, Prefect } from "./types";

export function buildEmail(opts: {
  fromTime: string;
  toTime: string;
  date: string;
  reason: string;
  prefects: Prefect[];
}): string {
  const { fromTime, toTime, date, reason, prefects } = opts;
  const lines = prefects.map((p, i) => {
    const classPart = p.class?.trim() ? ` - ${p.class.trim()}` : "";
    return `${i + 1}. ${p.name}${classPart}`;
  });

  return [
    "Good Morning Miss,",
    "",
    `Please be kind enough to grant leave for the following House Prefects from ${fromTime} to ${toTime} on ${date}, as they have duty at ${reason}:`,
    "",
    ...lines,
    "",
    "Thank you.",
  ].join("\n");
}

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function excuseTypeLabel(type: ExcuseType): string {
  if (type === "es") return "ES";
  if (type === "eg") return "EG";
  return "ES + EG";
}

export const inputClass =
  "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm ";

