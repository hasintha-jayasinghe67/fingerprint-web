export const AUDIT_CATEGORIES = [
  "auth",
  "events",
  "attendance",
  "gate_sheet",
  "tie_duties",
  "prefects",
  "batches",
  "excuses",
  "suspensions",
  "settings",
  "users",
  "devices",
  "automation",
  "other",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export function categoryLabel(category: string): string {
  switch (category) {
    case "auth":
      return "Logins";
    case "events":
      return "Events";
    case "attendance":
      return "Attendance";
    case "gate_sheet":
      return "Gate sheet";
    case "tie_duties":
      return "Tie duties";
    case "prefects":
      return "Prefects";
    case "batches":
      return "Batches";
    case "excuses":
      return "Excuses";
    case "suspensions":
      return "Suspensions";
    case "settings":
      return "Settings";
    case "users":
      return "Users";
    case "devices":
      return "Devices";
    case "automation":
      return "Automation";
    default:
      return "Other";
  }
}
