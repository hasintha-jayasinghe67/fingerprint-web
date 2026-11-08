/** Suspension screen shapes. */

export interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
}

export interface Suspension {
  id: number;
  prefectId: number;
  startDate: string;
  /** Inclusive; null = ongoing. */
  endDate: string | null;
  reason: string | null;
}

export type Status = "active" | "suspended" | "scheduled";
export type Filter = "all" | Status;
export type Tab = "prefects" | "past";

