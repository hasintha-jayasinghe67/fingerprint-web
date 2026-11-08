/** Leave excuse screen shapes. */

export interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code?: string | null;
  pin?: string | null;
}

export type ExcuseType = "es" | "eg" | "both";

export interface LeaveExcuse {
  id: number;
  excuseType: ExcuseType;
  startDate: string;
  endDate: string;
  reason: string | null;
  prefects: Prefect[];
}

export type Tab = "log" | "compose";

