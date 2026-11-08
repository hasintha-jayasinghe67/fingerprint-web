/** Tie duty screen shapes. */

export interface Batch {
  id: number;
  name: string;
  memberCount: number;
}

export interface TieDutyMember {
  prefectId: number | null;
  name: string;
  pin: string;
  code: string | null;
  class: string | null;
  batchName: string | null;
  /** Included automatically because they were suspended on the duty date. */
  wasSuspended?: boolean;
}

export interface TieDuty {
  id: number;
  /** 'YYYY-MM-DD' */
  dutyDate: string;
  prefectCount: number;
  batchNames: string[];
  createdAt: string;
  members: TieDutyMember[];
}

export type Tab = "history" | "assign";

/** An unsaved random draw awaiting confirmation. */
export interface Draft {
  /** Suspended prefects (always included) plus the random picks. */
  members: TieDutyMember[];
  /** Everyone randomly drawn so far this round; Reassign never picks them again. */
  drawnIds: number[];
  /** Places filled at random (count minus suspended prefects). */
  randomCount: number;
  /** Eligible prefects left for another Reassign. */
  remaining: number;
  attempt: number;
}

