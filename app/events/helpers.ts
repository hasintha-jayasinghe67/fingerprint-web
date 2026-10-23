function sriLankaNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDatetimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Default window: Sri Lanka now, two hours long. */
export function getDefaultEventDatetimes(): { start: string; end: string } {
  const start = sriLankaNow();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return { start: formatDatetimeLocal(start), end: formatDatetimeLocal(end) };
}

export function toDatetimeLocal(ts: string): string {
  return ts.replace(" ", "T").slice(0, 16);
}

export function fromDatetimeLocal(value: string): string {
  const s = value.trim().replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

export function formatEventStamp(ts: string): string {
  const [datePart, timePart = "00:00:00"] = ts.split(" ");
  const [y, m, d] = (datePart || "").split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dateLabel}, ${displayH}:${pad(min || 0)} ${period}`;
}

export function formatClock(time: string): string {
  const [h, m] = (time || "00:00:00").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${pad(m || 0)} ${period}`;
}

export function eventStatusLabel(status: string): string {
  if (status === "open") return "Open";
  if (status === "upcoming") return "Upcoming";
  return "Ended";
}

export function eventStatusClass(status: string): string {
  if (status === "open") return "bg-emerald-50 text-emerald-800";
  if (status === "upcoming") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}
