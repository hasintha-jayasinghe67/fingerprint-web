export const AUDIT_CATEGORIES = [
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
  "other",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export function categoryLabel(category: string): string {
  switch (category) {
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
    default:
      return "Other";
  }
}
