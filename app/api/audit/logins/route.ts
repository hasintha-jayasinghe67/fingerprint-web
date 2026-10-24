import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { requireSuperuser } from "@/lib/requireCaller";
import { describeDevice } from "@/lib/deviceLabel";
import { areaForIp, describeAreas } from "@/lib/ipArea";

const LOGIN_CAP = 5000;

type LoginSource = {
  created_at: string;
  actor_username: string | null;
  ip: string | null;
  user_agent: string | null;
};

export async function GET() {
  const auth = await requireSuperuser();
  if ("error" in auth) return auth.error;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("created_at, actor_username, ip, user_agent")
    .eq("action", "auth.login")
    .eq("success", true)
    .order("created_at", { ascending: false })
    .limit(LOGIN_CAP);

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

  const rows = (data || []) as LoginSource[];
  const areas = await describeAreas(rows.map((row) => row.ip));

  const byUser = new Map<
    string,
    { count: number; areas: string[]; devices: string[]; lastAt: string }
  >();

  for (const row of rows) {
    const username = row.actor_username || "(unknown)";
    let entry = byUser.get(username);
    if (!entry) {
      entry = { count: 0, areas: [], devices: [], lastAt: row.created_at };
      byUser.set(username, entry);
    }
    entry.count += 1;
    const area = areaForIp(areas, row.ip) || "Unknown area";
    if (!entry.areas.includes(area)) entry.areas.push(area);
    const device = describeDevice(row.user_agent);
    if (!entry.devices.includes(device)) entry.devices.push(device);
  }

  const logins = [...byUser.entries()]
    .map(([username, entry]) => ({ username, ...entry }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));

  return NextResponse.json({
    logins,
    capped: rows.length >= LOGIN_CAP,
    sampled: rows.length,
  });
}
