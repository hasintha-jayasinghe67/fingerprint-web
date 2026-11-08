export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function prettyJson(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function categoryChipClass(category: string): string {
  switch (category) {
    case "auth":
      return "bg-brand-100 text-brand-900";
    case "events":
      return "bg-violet-50 text-violet-800";
    case "attendance":
      return "bg-emerald-50 text-emerald-800";
    case "gate_sheet":
      return "bg-sky-50 text-sky-800";
    case "tie_duties":
      return "bg-amber-50 text-amber-800";
    case "suspensions":
      return "bg-violet-50 text-violet-800";
    case "excuses":
      return "bg-sky-50 text-sky-800";
    case "users":
      return "bg-slate-800 text-white";
    case "devices":
      return "bg-amber-50 text-amber-800";
    case "automation":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function fillDaySeries(
  series: { date: string; count: number }[],
  days: number
): { date: string; count: number }[] {
  const byDate = new Map(series.map((row) => [row.date, row.count]));
  const out: { date: string; count: number }[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
