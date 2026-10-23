#!/usr/bin/env node
/**
 * Ensures audit_logs can store sign-in rows. Uses the service-role key from
 * .env.local. Safe to re-run. Deletes its own canary row when finished.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: readError } = await supabase
  .from("audit_logs")
  .select("id, category, action")
  .limit(1);

if (readError) {
  console.error("audit_logs is not readable:", readError.message);
  console.error("Run setup/audit-logs.sql in the Supabase SQL editor.");
  process.exit(1);
}

const { data: inserted, error: insertError } = await supabase
  .from("audit_logs")
  .insert({
    actor_id: null,
    actor_username: "__schema_check__",
    actor_role: null,
    category: "auth",
    action: "auth.schema_check",
    summary: "Schema check for login audit rows (deleted immediately)",
    method: "POST",
    path: "/api/auth/login",
    status_code: 200,
    success: true,
    ip: null,
    user_agent: "schema-check",
    request_body: { check: true },
    response_body: { ok: true },
  })
  .select("id")
  .single();

if (insertError) {
  console.error("Could not insert an auth audit row:", insertError.message);
  process.exit(1);
}

const { error: deleteError } = await supabase
  .from("audit_logs")
  .delete()
  .eq("id", inserted.id);

if (deleteError) {
  console.error(
    `Inserted canary id=${inserted.id} but failed to delete it:`,
    deleteError.message
  );
  process.exit(1);
}

console.log(
  `audit_logs ready (existing_sample=${existing?.length ? "yes" : "empty"}). ` +
    "Sign-in rows use category=auth; no table rewrite was required."
);
