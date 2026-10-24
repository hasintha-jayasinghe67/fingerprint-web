import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Nightly cleanup of leave_excuses whose end date is before today in
 * Sri Lanka (Asia/Colombo). Each delete is written to audit_logs with
 * category "automation" so it shows on the logs page as Automation.
 *
 * Schedule: 18:30 UTC = 00:00 Asia/Colombo. See
 * setup/expire-leave-excuses-schedule.sql.
 */

type Prefect = { name?: string | null; code?: string | null; pin?: string | null };

type LeaveMember = {
  prefect_id?: number;
  prefects?: Prefect | Prefect[] | null;
};

type LeaveRow = {
  id: number;
  excuse_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  leave_excuse_prefects?: LeaveMember[] | null;
};

const jsonHeaders = { "Content-Type": "application/json" };

function sriLankaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function acceptedKeys(): Set<string> {
  const keys = [
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("SUPABASE_SECRET_KEY"),
  ].filter((key): key is string => Boolean(key));
  return new Set(keys);
}

function isAuthorized(req: Request): boolean {
  const keys = acceptedKeys();
  if (keys.size === 0) return false;
  const apiKey = req.headers.get("apikey") ?? "";
  if (keys.has(apiKey)) return true;
  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  return keys.has(token);
}

function prefectOf(member: LeaveMember): Prefect | null {
  const nested = member.prefects;
  if (!nested) return null;
  return Array.isArray(nested) ? nested[0] ?? null : nested;
}

function prefectLabel(member: LeaveMember): string {
  const prefect = prefectOf(member);
  return String(prefect?.code || prefect?.name || prefect?.pin || "").trim();
}

function summaryFor(row: LeaveRow): { summary: string; labels: string[] } {
  const labels = (row.leave_excuse_prefects ?? [])
    .map(prefectLabel)
    .filter(Boolean);
  const type = String(row.excuse_type || "leave").toUpperCase();
  const count = labels.length;
  const shown = labels.slice(0, 8).join(", ");
  const extra = count > 8 ? `, +${count - 8} more` : "";
  const who = shown ? `: ${shown}${extra}` : "";
  return {
    labels,
    summary: `Deleted expired ${type} excuse ${row.start_date} – ${row.end_date} (${count} prefect${count === 1 ? "" : "s"})${who}`,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = sriLankaToday();
  const { data, error } = await supabase
    .from("leave_excuses")
    .select(
      `
      id,
      excuse_type,
      start_date,
      end_date,
      reason,
      leave_excuse_prefects (
        prefect_id,
        prefects ( name, code, pin )
      )
    `,
    )
    .lt("end_date", today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const expired = (data ?? []) as LeaveRow[];
  if (expired.length === 0) {
    return new Response(JSON.stringify({ today, deleted: 0 }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const ids = expired.map((row) => row.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error: deleteError } = await supabase
      .from("leave_excuses")
      .delete()
      .in("id", chunk);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message, today }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  const logs = expired.map((row) => {
    const { summary, labels } = summaryFor(row);
    return {
      actor_id: null,
      actor_username: "Automation",
      actor_role: null,
      category: "automation",
      action: "automation.leave_excuse.delete",
      summary,
      method: "CRON",
      path: "/functions/v1/expire-leave-excuses",
      status_code: 200,
      success: true,
      request_body: {
        id: row.id,
        excuseType: row.excuse_type,
        startDate: row.start_date,
        endDate: row.end_date,
        reason: row.reason,
        prefects: labels,
      },
      response_body: { deleted: true, today },
    };
  });

  const { error: logError } = await supabase.from("audit_logs").insert(logs);
  if (logError) {
    return new Response(
      JSON.stringify({
        error: `Deleted ${ids.length} excuses but the log write failed: ${logError.message}`,
        today,
        deleted: ids.length,
      }),
      { status: 500, headers: jsonHeaders },
    );
  }

  return new Response(JSON.stringify({ today, deleted: ids.length }), {
    status: 200,
    headers: jsonHeaders,
  });
});
