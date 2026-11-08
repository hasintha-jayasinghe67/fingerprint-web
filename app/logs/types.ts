/** Rows shown on the logs screen. */

export interface AuditLog {
  id: number;
  created_at: string;
  actor_id: number | null;
  actor_username: string | null;
  actor_role: string | null;
  category: string;
  action: string;
  summary: string;
  method: string | null;
  path: string | null;
  status_code: number | null;
  success: boolean;
  ip: string | null;
  user_agent: string | null;
  location: string | null;
  request_body: unknown;
  response_body: unknown;
}

export interface SignInSummary {
  username: string;
  count: number;
  areas: string[];
  devices: string[];
  lastAt: string;
}

export interface AuditStats {
  days: number;
  sampled: number;
  capped: boolean;
  total: number;
  logins: number;
  writes: number;
  failed: number;
  uniqueUsers: number;
  byCategory: Record<string, number>;
  users: {
    username: string;
    total: number;
    failed: number;
    logins: number;
    writes: number;
  }[];
  daysSeries: { date: string; count: number }[];
}

