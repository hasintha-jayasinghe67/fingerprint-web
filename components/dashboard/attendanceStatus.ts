/** Labels and colours for a live attendance punch. */

export interface AttendanceEvent {
  pin: string;
  name: string | null;
  class?: string | null;
  code?: string | null;
  timestamp: string;
  status: string;
  verifyMode: string;
  verifyMethod: string;
  workCode: string | null;
  deviceSN: string;
  /** Server-computed: morning late per gate-duty vs 07:00 rules. */
  late?: boolean;
  /** Was late, but excused on the spot for this day (late is then false). */
  lateExcused?: boolean;
  suspended?: boolean;
  /** Morning cutoff (HH:MM:SS) that applied to this prefect; null outside the morning slot. */
  deadline?: string | null;
}

export interface DeviceInfo {
  serialNumber: string;
  lastSeen: string;
  ip: string | null;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

export function getStatusLabel(status: string): string {
  switch (status) {
    case "0":
      return "Check In";
    case "1":
      return "Check Out";
    case "2":
      return "Break Out";
    case "3":
      return "Break In";
    case "4":
      return "Overtime In";
    case "5":
      return "Overtime Out";
    default:
      return `Status ${status}`;
  }
}

/**
 * Fallback only if the API omits `late` (older server). Prefer event.late.
 * Without batch context, treat morning scans after 07:00 as late.
 */
export function isMorningLate(timePart: string): boolean {
  if (!timePart) return false;
  const t = timePart.length === 5 ? `${timePart}:00` : timePart;
  return t < "11:00:00" && t > "07:00:00";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "0":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "1":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "2":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "3":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function getVerifyLabel(method: string): string {
  if (method.includes("Fingerprint")) return "Fingerprint";
  if (method.includes("Card")) return "Card";
  if (method.includes("Face")) return "Face";
  if (method.includes("Password")) return "Password";
  return method;
}


/** Prefer the server late flag. Fall back to the morning clock rule. */
export function eventIsLate(event: Pick<AttendanceEvent, "late" | "timestamp">): boolean {
  return event.late ?? isMorningLate(event.timestamp.split(" ")[1] || "");
}
