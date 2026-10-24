import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { mapUsernameToEmail } from "@/lib/emailMap";
import { clientIp, writeAuditLog, type AuditActor } from "@/lib/audit";
import { requireCaller } from "@/lib/requireCaller";
import { sanitizeText } from "@/lib/sanitize";

/**
 * Records a sign-in attempt in audit_logs. The browser still authenticates
 * with Supabase; this route only attributes the attempt.
 *
 * A valid session cookie means the sign-in succeeded — we never trust the
 * client to say "ok". Failed / disabled attempts are logged from the
 * username they typed.
 */
export async function POST(request: Request) {
  let body: { username?: string; result?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const typedUsername = sanitizeText(body.username || "");
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent");
  const caller = await requireCaller();

  if (!("error" in caller)) {
    await writeAuditLog({
      actor: caller.actor,
      category: "auth",
      action: "auth.login",
      summary: `Signed in as "${caller.actor.username}"`,
      method: "POST",
      path: "/api/auth/login",
      statusCode: 200,
      success: true,
      ip,
      userAgent,
      requestBody: { username: caller.actor.username },
      responseBody: { result: "ok" },
    });
    return NextResponse.json({ result: "ok" });
  }

  if (!typedUsername) {
    return NextResponse.json({ result: "invalid" }, { status: 401 });
  }

  let actor: AuditActor | null = null;
  let disabled = false;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("users")
      .select("id, username, role, disabled")
      .eq("email", mapUsernameToEmail(typedUsername))
      .maybeSingle();
    if (data) {
      actor = {
        id: data.id,
        username: data.username,
        role: data.role,
      };
      disabled = Boolean(data.disabled);
    }
  } catch {
    // Lookup is best-effort; still record the typed username.
  }

  const blocked = disabled || body.result === "disabled";
  const result = blocked ? "disabled" : "invalid";
  const displayName = actor?.username || typedUsername;

  await writeAuditLog({
    actor,
    category: "auth",
    action: blocked ? "auth.login_disabled" : "auth.login_failed",
    summary: blocked
      ? `Blocked sign-in for disabled account "${displayName}"`
      : `Failed sign-in as "${displayName}"`,
    method: "POST",
    path: "/api/auth/login",
    statusCode: 401,
    success: false,
    ip,
    userAgent,
    requestBody: { username: typedUsername },
    responseBody: { result },
  });

  return NextResponse.json({ result }, { status: 401 });
}
