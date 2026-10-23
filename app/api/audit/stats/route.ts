import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { requireSuperuser } from "@/lib/requireCaller";

const STATS_CAP = 5000;

export async function GET(request: Request) {
  const auth = await requireSuperuser();
  if ("error" in auth) return auth.error;

  const days = Math.min(
    90,
    Math.max(1, Number(new URL(request.url).searchParams.get("days") || 30) || 30)
  );
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("created_at, actor_username, category, success")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(STATS_CAP);

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
  const byCategory: Record<string, number> = {};
  const byUser: Record<string, { total: number; failed: number }> = {};
  const byDay: Record<string, number> = {};
  let failed = 0;

  for (const row of rows) {
    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    const name = row.actor_username || "(unknown)";
    if (!byUser[name]) byUser[name] = { total: 0, failed: 0 };
    byUser[name].total += 1;
    if (!row.success) {
      failed += 1;
      byUser[name].failed += 1;
    }
    const day = String(row.created_at).slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const users = Object.entries(byUser)
    .map(([username, stats]) => ({ username, ...stats }))
    .sort((a, b) => b.total - a.total);

  const daysSeries = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    days,
    sampled: rows.length,
    capped: rows.length >= STATS_CAP,
    total: rows.length,
    failed,
    uniqueUsers: users.length,
    byCategory,
    users,
    daysSeries,
  });
}
