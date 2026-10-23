import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { AuditActor } from "@/lib/audit";

type CallerRow = AuditActor & { email: string; disabled: boolean };

export async function requireCaller(): Promise<
  { error: NextResponse } | { actor: CallerRow }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  let { data } = await supabase
    .from("users")
    .select("id, username, role, email, disabled")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!data) {
    const fallback = await supabase
      .from("users")
      .select("id, username, role, email")
      .eq("auth_id", user.id)
      .maybeSingle();
    data = fallback.data
      ? { ...fallback.data, disabled: false }
      : null;
  }

  if (!data) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }
  if (data.disabled) {
    return {
      error: NextResponse.json(
        { error: "This account has been disabled." },
        { status: 403 }
      ),
    };
  }

  return {
    actor: {
      id: data.id,
      username: data.username,
      role: data.role,
      email: data.email,
      disabled: Boolean(data.disabled),
    },
  };
}

export async function requireSuperuser(): Promise<
  { error: NextResponse } | { actor: CallerRow }
> {
  const result = await requireCaller();
  if ("error" in result) return result;
  if (result.actor.role !== "superuser") {
    return {
      error: NextResponse.json(
        { error: "Only superusers can view audit logs" },
        { status: 403 }
      ),
    };
  }
  return result;
}
