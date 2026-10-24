import { NextResponse } from "next/server";
import {
  classifyWrite,
  clientIp,
  parseBody,
  writeAuditLog,
} from "@/lib/audit";
import { enrichAuditSummary } from "@/lib/auditDetail";
import { requireCaller } from "@/lib/requireCaller";
import { sanitizeData, sanitizeSearch, sanitizeText } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ path: string[] }> };

function sanitizeJsonBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  try {
    return JSON.stringify(sanitizeData(JSON.parse(trimmed)));
  } catch {
    return raw;
  }
}

function backendOrigin(): string {
  const url = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
  if (!url) {
    throw new Error("BACKEND_API_URL is not set");
  }
  return url;
}

/** Read the record before a write so the log can say what changed. */
function beforeImagePath(method: string, apiPath: string): string | null {
  const path = apiPath.replace(/\?.*$/, "");
  const verb = method.toUpperCase();
  const gate = path.match(/^\/api\/gate-attendance\/(\d{4}-\d{2}-\d{2})$/);
  if (gate && verb === "POST") return `/api/attendance/date/${gate[1]}`;
  if (verb !== "PUT" && verb !== "PATCH" && verb !== "DELETE") return null;
  if (
    /^\/api\/(general-attendance|special-events|batches)\/[^/]+$/.test(path) ||
    path === "/api/settings" ||
    path === "/api/gate-sheet"
  ) {
    return path;
  }
  return null;
}

async function readBeforeImage(method: string, apiPath: string): Promise<unknown> {
  const path = beforeImagePath(method, apiPath);
  if (!path) return null;
  try {
    const res = await fetch(`${backendOrigin()}${path}`, {
      headers: { accept: "application/json", "x-hpa-prefetch": "1" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function handle(request: Request, { params }: RouteContext) {
  const caller = await requireCaller();
  if ("error" in caller) return caller.error;

  const { path } = await params;
  const search = sanitizeSearch(new URL(request.url).search);
  const apiPath = `/api/${path.map((segment) => sanitizeText(segment)).join("/")}`;
  const target = `${backendOrigin()}${apiPath}${search}`;
  const method = request.method.toUpperCase();
  const write = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const rawBody = write ? sanitizeJsonBody(await request.text()) : "";
  const previous = write ? await readBeforeImage(method, apiPath) : null;

  let upstream: Response;
  try {
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const accept = request.headers.get("accept");
    if (accept) headers.set("accept", accept);

    upstream = await fetch(target, {
      method,
      headers,
      body: write ? rawBody : undefined,
    });
  } catch (err) {
    if (write) {
      const classified = classifyWrite(method, apiPath);
      const failure = {
        error: err instanceof Error ? err.message : "Upstream unreachable",
      };
      await writeAuditLog({
        actor: caller.actor,
        ...classified,
        summary: enrichAuditSummary(classified.summary, {
          method,
          path: apiPath,
          requestBody: parseBody(rawBody),
          responseBody: failure,
          previous,
          ok: false,
        }),
        method,
        path: `${apiPath}${search}`,
        statusCode: 502,
        success: false,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        requestBody: parseBody(rawBody),
        responseBody: failure,
      });
    }
    return NextResponse.json(
      { error: "Attendance server unreachable" },
      { status: 502 }
    );
  }

  const responseText = await upstream.text();
  const requestBody = write ? parseBody(rawBody) : null;
  const responseBody = parseBody(responseText);

  if (write) {
    const classified = classifyWrite(method, apiPath);
    await writeAuditLog({
      actor: caller.actor,
      ...classified,
      summary: enrichAuditSummary(classified.summary, {
        method,
        path: apiPath,
        requestBody,
        responseBody,
        previous,
        ok: upstream.ok,
      }),
      method,
      path: `${apiPath}${search}`,
      statusCode: upstream.status,
      success: upstream.ok,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
      requestBody,
      responseBody,
    });
  } else if (upstream.ok) {
    const saved = responseBody as { attendanceJustSaved?: boolean; name?: string; presentCount?: number; id?: number; startAt?: string; endAt?: string } | null;
    if (saved && typeof saved === "object" && saved.attendanceJustSaved) {
      await writeAuditLog({
        actor: caller.actor,
        category: "events",
        action: "events.attendance.save",
        summary: `Saved attendance for special event “${saved.name || "event"}” (${saved.presentCount ?? 0} signed in)`,
        method: "GET",
        path: `${apiPath}${search}`,
        statusCode: upstream.status,
        success: true,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        responseBody: {
          id: saved.id,
          name: saved.name,
          presentCount: saved.presentCount,
          startAt: saved.startAt,
          endAt: saved.endAt,
        },
      });
    }
  }

  const outHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) outHeaders.set("content-type", upstreamType);

  return new NextResponse(responseText, {
    status: upstream.status,
    headers: outHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
