/** One special event and the prefects on its roll. */

export interface EventPrefect {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
  timestamp?: string;
  time?: string | null;
  status?: string;
}

export interface SpecialEventDetail {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "open" | "ended";
  presentCount: number;
  present: EventPrefect[];
  absent: EventPrefect[];
  entries?: EventPrefect[];
  attendanceSaved?: boolean;
  excusesApplied?: boolean;
  attendanceUnavailable?: boolean;
  suggestedExcused?: string;
}

