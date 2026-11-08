import type { Role } from "@/lib/AuthContext";

export interface DbUser {
  id: number;
  username: string;
  role: Role;
  created_at: string;
  disabled: boolean;
}
