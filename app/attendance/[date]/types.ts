/** Data for one attendance day, as returned by the server. */

export interface SlotEntry {
  prefectId?: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  time: string;
  late: boolean;
  /** Was late, but excused on the spot for this day (late is then false). */
  lateExcused?: boolean;
  suspended?: boolean;
  /** Morning cutoff (HH:MM:SS) that applied to this prefect; null for other slots. */
  deadline?: string | null;
}

export interface SlotAttendanceEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  time: string | null;
  status: string | null;
  defaultStatus: "Present" | "Absent";
}

export interface SlotAttendanceBlock {
  saved: boolean;
  entries: SlotAttendanceEntry[];
}

export interface GateEntry {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  registered: boolean;
  status: string | null;
  // Server-computed: "Late" for morning latecomers; "To be marked" otherwise.
  defaultStatus: string | null;
  // Gate-sheet duty for this date's weekday (MG / PG / PBG), if any.
  gateAssignment: "MG" | "PG" | "PBG" | null;
  // True when the prefect has at least one fingerprint scan that day.
  signedIn: boolean;
}

export interface DayBatch {
  id: number;
  name: string;
  morningSigninTime: string;
  extended: boolean;
}

export interface LeaveExcuseLists {
  es: string;
  eg: string;
  esPrefectIds: number[];
  egPrefectIds: number[];
}

export interface DayData {
  date: string;
  batches: DayBatch[];
  gateSaved: boolean;
  dayOfWeek: number;
  gateEntries: GateEntry[];
  leaveExcuses?: LeaveExcuseLists;
  slots: {
    morning: SlotEntry[];
    second: SlotEntry[];
    third: SlotEntry[];
  };
  slotAttendance: {
    second: SlotAttendanceBlock;
    third: SlotAttendanceBlock;
  };
}

export type Tab = "morning" | "second" | "third" | "gate";
export type GateDutyTab = "MG" | "PG" | "PBG" | "all" | "traitors";
export type AttendanceSlot = "second" | "third";

export const SLOT_STATUSES = ["Present", "Absent"] as const;

export const GATE_DUTY_TABS: { id: GateDutyTab; label: string }[] = [
  { id: "MG", label: "Main Gate" },
  { id: "PG", label: "Pool Gate" },
  { id: "PBG", label: "Palm Beach Gate" },
  { id: "all", label: "All" },
  { id: "traitors", label: "Traitors" },
];

export const EXCUSE_TEXTAREA_ROWS = 8;
