import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabaseServer";

/**
 * Confirms the signed-in caller's password without touching the request
 * session. Used for privileged user-management actions (disable account).
 */
export async function verifyCallerPassword(
  email: string,
  password: string
): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  const trimmed = password.trim();
  if (!trimmed) return false;
  const check = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await check.auth.signInWithPassword({
    email,
    password: trimmed,
  });
  return !error;
}