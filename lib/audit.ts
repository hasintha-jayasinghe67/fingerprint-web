import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import type { AuditCategory } from "@/lib/auditLabels";
export { AUDIT_CATEGORIES, categoryLabel, type AuditCategory } from "@/lib/auditLabels";

export type AuditActor = {
  id: number;
  username: string;
  role: string;
};

export type AuditWrite = {
  actor: AuditActor | null;
  category: AuditCategory;
  action: string;
  summary: string;
  method?: string;
  path?: string;
  statusCode?: number;
  success?: boolean;
  ip?: string | null;
  userAgent?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
};

const SECRET_KEYS = new Set([
  "password",
  "confirmPassword",
  "currentPassword",
  "newPassword",
  "confirm",
]);

const MAX_JSON_CHARS = 16_384;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEYS.has(key) ? "[redacted]" : redactSecrets(nested);
    }
    return out;
  }
  return value;
}

export function parseBody(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { text: trimmed.slice(0, MAX_JSON_CHARS) };
  }
}

export function clipJson(value: unknown): unknown {
  if (value == null) return null;
  const encoded = JSON.stringify(value);
  if (encoded.length <= MAX_JSON_CHARS) return value;
  return {
    truncated: true,
    preview: encoded.slice(0, MAX_JSON_CHARS),
  };
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export function classifyWrite(
  method: string,
  apiPath: string
): { category: AuditCategory; action: string; summary: string } {
  const path = apiPath.replace(/\?.*$/, "");
  const verb = method.toUpperCase();

  const rule = (
    category: AuditCategory,
    action: string,
    summary: string
  ) => ({ category, action, summary });

  if (/^\/api\/gate-sheet\/?$/.test(path) && verb === "PUT") {
    return rule("gate_sheet", "gate_sheet.update", "Updated gate sheet");
  }
  if (/^\/api\/gate-attendance\/[^/]+\/excuses$/.test(path)) {
    return rule("attendance", "attendance.excuses", `Applied ES/EG excuses (${path.split("/")[3]})`);
  }
  if (/^\/api\/gate-attendance\//.test(path)) {
    return rule("attendance", "attendance.gate.save", `Saved gate attendance (${path.split("/")[3]})`);
  }
  if (/^\/api\/slot-attendance\//.test(path)) {
    const parts = path.split("/");
    return rule(
      "attendance",
      "attendance.slot.save",
      `Saved ${parts[4] || "slot"} attendance (${parts[3]})`
    );
  }
  if (/^\/api\/general-attendance\/[^/]+$/.test(path) && verb === "PUT") {
    return rule("attendance", "attendance.general.update", "Updated general attendance");
  }
  if (/^\/api\/general-attendance\/?$/.test(path) && verb === "POST") {
    return rule("attendance", "attendance.general.create", "Created general attendance");
  }
  if (/^\/api\/special-events\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("events", "events.delete", "Deleted a special event");
  }
  if (/^\/api\/special-events\/[^/]+$/.test(path) && verb === "PUT") {
    return rule("events", "events.update", "Updated a special event");
  }
  if (/^\/api\/special-events\/?$/.test(path) && verb === "POST") {
    return rule("events", "events.create", "Created a special event");
  }
  if (/^\/api\/late-excusals/.test(path)) {
    return rule(
      "attendance",
      verb === "DELETE" ? "attendance.late_excuse.undo" : "attendance.late_excuse",
      verb === "DELETE" ? "Removed a late excuse" : "Excused a late sign-in"
    );
  }
  if (/^\/api\/tie-duties\/draw$/.test(path)) {
    return rule("tie_duties", "tie_duties.draw", "Drew tie duty assignment");
  }
  if (/^\/api\/tie-duties\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("tie_duties", "tie_duties.delete", "Deleted a tie duty");
  }
  if (/^\/api\/tie-duties\/?$/.test(path) && verb === "POST") {
    return rule("tie_duties", "tie_duties.save", "Saved tie duty assignment");
  }
  if (/\/register-device$/.test(path)) {
    return rule("prefects", "prefects.register_device", "Queued fingerprint enrollment");
  }
  if (/\/unregister-device$/.test(path)) {
    return rule("prefects", "prefects.unregister_device", "Queued fingerprint removal");
  }
  if (/^\/api\/prefects\/[^/]+\/suspensions$/.test(path)) {
    return rule("suspensions", "suspensions.create", "Added a suspension");
  }
  if (/^\/api\/prefects\/[^/]+$/.test(path) && verb === "PUT") {
    return rule("prefects", "prefects.update", "Updated a prefect");
  }
  if (/^\/api\/prefects\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("prefects", "prefects.delete", "Deleted a prefect");
  }
  if (/^\/api\/prefects\/?$/.test(path) && verb === "POST") {
    return rule("prefects", "prefects.create", "Added a prefect");
  }
  if (/^\/api\/batches\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("batches", "batches.delete", "Deleted a batch");
  }
  if (/^\/api\/batches\/[^/]+$/.test(path) && verb === "PUT") {
    return rule("batches", "batches.update", "Updated a batch");
  }
  if (/^\/api\/batches\/?$/.test(path) && verb === "POST") {
    return rule("batches", "batches.create", "Created a batch");
  }
  if (/^\/api\/leave-excuses\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("excuses", "excuses.delete", "Deleted a leave excuse");
  }
  if (/^\/api\/leave-excuses/.test(path)) {
    return rule(
      "excuses",
      verb === "PUT" ? "excuses.update" : "excuses.create",
      verb === "PUT" ? "Updated a leave excuse" : "Logged a leave excuse"
    );
  }
  if (/^\/api\/suspensions\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("suspensions", "suspensions.delete", "Deleted a suspension");
  }
  if (/^\/api\/suspensions\/[^/]+$/.test(path) && verb === "PUT") {
    return rule("suspensions", "suspensions.update", "Updated a suspension");
  }
  if (/^\/api\/settings/.test(path)) {
    return rule("settings", "settings.update", "Updated sign-in settings");
  }
  if (/^\/api\/devices\/clear-command-queue$/.test(path)) {
    return rule("devices", "devices.clear_queue", "Cleared the device command queue");
  }
  if (/^\/api\/sms$/.test(path)) {
    return rule("devices", "devices.sms", "Sent a notice to the device");
  }
  if (/^\/api\/users\/[^/]+$/.test(path) && verb === "PATCH") {
    return rule("users", "users.update", "Updated a user account");
  }
  if (/^\/api\/users\/[^/]+$/.test(path) && verb === "DELETE") {
    return rule("users", "users.delete", "Deleted a user account");
  }
  if (/^\/api\/users\/?$/.test(path) && verb === "POST") {
    return rule("users", "users.create", "Created a user account");
  }

  const category: AuditCategory = path.includes("attendance")
    ? "attendance"
    : path.includes("prefect")
      ? "prefects"
      : path.includes("batch")
        ? "batches"
        : "other";
  return rule(
    category,
    `${category}.${verb.toLowerCase()}`,
    `${verb} ${path}`
  );
}

/** Insert an audit row. Never throws — a logging failure must not block the write. */
export async function writeAuditLog(entry: AuditWrite): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: entry.actor?.id ?? null,
      actor_username: entry.actor?.username ?? null,
      actor_role: entry.actor?.role ?? null,
      category: entry.category,
      action: entry.action,
      summary: entry.summary,
      method: entry.method ?? null,
      path: entry.path ?? null,
      status_code: entry.statusCode ?? null,
      success: entry.success !== false,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      request_body: clipJson(redactSecrets(entry.requestBody)),
      response_body: clipJson(redactSecrets(entry.responseBody)),
    });
    if (error) {
      console.error("audit_logs insert failed:", error.message);
    }
  } catch (err) {
    console.error(
      "audit_logs insert failed:",
      err instanceof Error ? err.message : err
    );
  }
}
