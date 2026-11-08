/**
 * Wall-clock helpers for Sri Lanka (UTC+5:30).
 *
 * Device punches are already stored as "YYYY-MM-DD HH:MM:SS" in that
 * zone. Format them directly. Do not pass them through `new Date()`,
 * which would shift them by the browser's timezone.
 */

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's calendar date in Sri Lanka, as YYYY-MM-DD. */
export function getTodaySriLankanDateISO(from = new Date()): string {
  const sl = new Date(from.getTime() + from.getTimezoneOffset() * 60_000 + SL_OFFSET_MS);
  const y = sl.getFullYear();
  const m = String(sl.getMonth() + 1).padStart(2, "0");
  const d = String(sl.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Move a YYYY-MM-DD date by a number of calendar days. */
export function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Monday, November 6, 2026". Invalid input is returned unchanged. */
export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * "07:05:09" or "2026-11-06 07:05:09" → "7:05:09 AM".
 * Pass `withSeconds: false` for "7:05 AM".
 */
export function formatClock(value: string, withSeconds = true): string {
  const timePart = value.includes(" ") ? value.split(" ")[1] : value;
  if (!timePart) return value;
  const [hRaw, mRaw, sRaw] = timePart.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour = `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  if (!withSeconds || sRaw == null || sRaw === "") return `${hour} ${period}`;
  return `${hour}:${String(sRaw).padStart(2, "0")} ${period}`;
}

/** "Today", "Yesterday", or "" so the caller can hide the badge. */
export function relativeDayLabel(iso: string): string {
  const today = getTodaySriLankanDateISO();
  if (iso === today) return "Today";
  if (iso === shiftISODate(today, -1)) return "Yesterday";
  return "";
}

/** First letter of a name, for the round avatar. */
export function avatarChar(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

/** Live header clock. Colombo zone, 12-hour, with seconds. */
export function formatColomboNow(date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
