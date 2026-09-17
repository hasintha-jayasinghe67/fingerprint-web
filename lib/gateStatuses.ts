export const GATE_STATUSES = [
  "To be marked",
  "Present",
  "Absent",
  "Late",
  "EG",
  "ES",
  "Traitor",
] as const;

export type GateStatus = (typeof GATE_STATUSES)[number];

export const DEFAULT_GATE_STATUS: GateStatus = "To be marked";

export const GATE_STATUS_STYLES: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-red-50 text-red-700 border-red-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  EG: "bg-sky-50 text-sky-700 border-sky-200",
  ES: "bg-slate-100 text-slate-700 border-slate-200",
  Traitor: "bg-rose-50 text-rose-700 border-rose-200",
  "To be marked": "bg-slate-50 text-slate-500 border-slate-200",
};
