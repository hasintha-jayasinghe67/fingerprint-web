import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { AUDIT_CATEGORIES } from "@/lib/auditLabels";
import { requireSuperuser } from "@/lib/requireCaller";
import { areaForIp, describeAreas } from "@/lib/ipArea";

const PAGE_SIZE_MAX = 100;

export async function GET(request: Request) {
  const auth = await requireSuperuser();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "";
  const actor = url.searchParams.get("actor") || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const successParam = url.searchParams.get("success");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
  const limit = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get("limit") || 50) || 50)
  );

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select(
      "id, created_at, actor_id, actor_username, actor_role, category, action, summary, method, path, status_code, success, ip, user_agent, request_body, response_body",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (category && (AUDIT_CATEGORIES as readonly string[]).includes(category)) {
    query = query.eq("category", category);
  }
  if (actor) query = query.eq("actor_username", actor);
  if (successParam === "true") query = query.eq("success", true);
  if (successParam === "false") query = query.eq("success", false);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (q) {
    const escaped = q.replace(/[%_,]/g, "");
    query = query.or(
      `summary.ilike.%${escaped}%,path.ilike.%${escaped}%,actor_username.ilike.%${escaped}%,action.ilike.%${escaped}%`
    );
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("schema cache") ||
          error.message.includes("does not exist")
            ? "Audit log table is missing. Run setup/audit-logs.sql in the Supabase SQL editor."
            : error.message,
      },
      { status: 500 }
    );
  }

  const rows = data || [];
  const areas = await describeAreas(rows.map((row) => row.ip));

  return NextResponse.json({
    logs: rows.map((row) => ({
      ...row,
      location: areaForIp(areas, row.ip),
    })),
    total: count ?? 0,
    offset,
    limit,
  });
}
