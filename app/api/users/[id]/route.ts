import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabaseServer";
import { validatePassword } from "@/lib/passwordPolicy";
import { verifyCallerPassword } from "@/lib/verifyCallerPassword";
import { clientIp, writeAuditLog, type AuditActor } from "@/lib/audit";

const ROLES = ["superuser", "admin", "view-only"] as const;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Authenticates the caller and returns { supabase, callerId, supabaseAdmin }
 * or a JSON error response when the caller is not a superuser.
 */
async function getSuperuserContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const { data: callerRow } = await supabase
    .from("users")
    .select("id, role, email, username")
    .eq("auth_id", caller.id)
    .maybeSingle();
  if (callerRow?.role !== "superuser") {
    return {
      error: NextResponse.json(
        { error: "Only superusers can manage users" },
        { status: 403 }
      ),
    };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: err instanceof Error ? err.message : "Server misconfigured" },
        { status: 500 }
      ),
    };
  }

  return {
    supabase,
    callerId: callerRow.id,
    callerEmail: callerRow.email as string,
    actor: {
      id: callerRow.id,
      username: callerRow.username as string,
      role: callerRow.role as string,
    } satisfies AuditActor,
    supabaseAdmin,
  };
}

async function getTargetUser(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  id: number
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, username, role, disabled")
    .eq("id", id)
    .maybeSingle();
  if (!error && data) {
    return data as {
      id: number;
      auth_id: string;
      username: string;
      role: string;
      disabled: boolean;
    };
  }
  const fallback = await supabaseAdmin
    .from("users")
    .select("id, auth_id, username, role")
    .eq("id", id)
    .maybeSingle();
  if (fallback.error || !fallback.data) return null;
  return { ...fallback.data, disabled: false } as {
    id: number;
    auth_id: string;
    username: string;
    role: string;
    disabled: boolean;
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const ctx = await getSuperuserContext();
  if ("error" in ctx) return ctx.error;
  const { callerId, callerEmail, actor, supabaseAdmin } = ctx;

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const target = await getTargetUser(supabaseAdmin, targetId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: {
    role?: string;
    password?: string;
    disabled?: boolean;
    confirmPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as (typeof ROLES)[number])) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (targetId === callerId) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 }
      );
    }
    if (target.role === "superuser" && body.role !== "superuser") {
      const { data: superusers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("role", "superuser")
        .neq("id", targetId);
      if (!superusers || superusers.length === 0) {
        return NextResponse.json(
          { error: "At least one superuser must remain in the system." },
          { status: 400 }
        );
      }
    }
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ role: body.role })
      .eq("id", targetId);
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user: " + updateError.message },
        { status: 500 }
      );
    }
  }

  if (body.password !== undefined && body.password !== "") {
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(
      target.auth_id,
      { password: body.password }
    );
    if (pwdError) {
      return NextResponse.json({ error: pwdError.message }, { status: 400 });
    }
    // Force-sign-out so a stolen session dies after the password reset.
    await supabaseAdmin.auth.admin.signOut(target.auth_id, "global");
  }

  if (typeof body.disabled === "boolean" && body.disabled !== target.disabled) {
    if (body.disabled) {
      const confirmed = await verifyCallerPassword(
        callerEmail,
        body.confirmPassword ?? ""
      );
      if (!confirmed) {
        return NextResponse.json(
          { error: "Incorrect password. Account was not disabled." },
          { status: 403 }
        );
      }
      if (targetId === callerId) {
        return NextResponse.json(
          { error: "You cannot disable your own account." },
          { status: 400 }
        );
      }
      if (target.role === "superuser") {
        const { data: superusers } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("role", "superuser")
          .eq("disabled", false)
          .neq("id", targetId);
        if (!superusers || superusers.length === 0) {
          return NextResponse.json(
            { error: "At least one active superuser must remain in the system." },
            { status: 400 }
          );
        }
      }
    }

    const { error: disableError } = await supabaseAdmin
      .from("users")
      .update({ disabled: body.disabled })
      .eq("id", targetId);
    if (disableError) {
      return NextResponse.json(
        { error: "Failed to update account: " + disableError.message },
        { status: 500 }
      );
    }

    // Ban in Auth so sign-in fails, and drop every refresh token so the
    // next server auth check (proxy) treats the session as gone.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      target.auth_id,
      { ban_duration: body.disabled ? "876000h" : "none" }
    );
    if (banError) {
      return NextResponse.json(
        { error: "Failed to update account: " + banError.message },
        { status: 500 }
      );
    }
    await supabaseAdmin.auth.admin.signOut(target.auth_id, "global");
  }

  const changes: string[] = [];
  if (body.role !== undefined && body.role !== target.role) {
    changes.push(`role → ${body.role}`);
  }
  if (body.password !== undefined && body.password !== "") {
    changes.push("password reset");
  }
  if (typeof body.disabled === "boolean" && body.disabled !== target.disabled) {
    changes.push(body.disabled ? "disabled" : "re-enabled");
  }
  if (changes.length > 0) {
    await writeAuditLog({
      actor,
      category: "users",
      action:
        typeof body.disabled === "boolean" && body.disabled !== target.disabled
          ? body.disabled
            ? "users.disable"
            : "users.enable"
          : "users.update",
      summary: `Updated user "${target.username}": ${changes.join(", ")}`,
      method: "PATCH",
      path: `/api/users/${targetId}`,
      statusCode: 200,
      success: true,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
      requestBody: {
        role: body.role,
        password: body.password ? "[redacted]" : undefined,
        disabled: body.disabled,
      },
      responseBody: { ok: true },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const ctx = await getSuperuserContext();
  if ("error" in ctx) return ctx.error;
  const { callerId, actor, supabaseAdmin } = ctx;

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const target = await getTargetUser(supabaseAdmin, targetId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetId === callerId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }
  if (target.role === "superuser") {
    const { data: superusers } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "superuser")
      .neq("id", targetId);
    if (!superusers || superusers.length === 0) {
      return NextResponse.json(
        { error: "At least one superuser must remain in the system." },
        { status: 400 }
      );
    }
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    target.auth_id
  );
  if (authError) {
    return NextResponse.json(
      { error: "Failed to delete user: " + authError.message },
      { status: 500 }
    );
  }
  await supabaseAdmin.from("users").delete().eq("id", targetId);

  await writeAuditLog({
    actor,
    category: "users",
    action: "users.delete",
    summary: `Deleted user "${target.username}"`,
    method: "DELETE",
    path: `/api/users/${targetId}`,
    statusCode: 200,
    success: true,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
    requestBody: { id: targetId, username: target.username },
    responseBody: { ok: true },
  });

  return NextResponse.json({ ok: true });
}
