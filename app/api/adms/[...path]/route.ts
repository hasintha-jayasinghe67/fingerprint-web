import { NextResponse } from "next/server";
import {
  classifyWrite,
  clientIp,
  parseBody,
  writeAuditLog,
} from "@/lib/audit";
import { requireCaller } from "@/lib/requireCaller";

type RouteContext = { params: Promise<{ path: string[] }> };

function backendOrigin(): string {
  const url = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
  if (!url) {
    throw new Error("BACKEND_API_URL is not set");
  }
  return url;
}

async function handle(request: Request, { params }: RouteContext) {
  const caller = await requireCaller();
  if ("error" in caller) return caller.error;

  const { path } = await params;
  const search = new URL(request.url).search;
  const apiPath = `/api/${path.join("/")}`;
  const target = `${backendOrigin()}${apiPath}${search}`;
  const method = request.method.toUpperCase();
  const write = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const rawBody = write ? await request.text() : "";

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
      await writeAuditLog({
        actor: caller.actor,
        ...classified,
        method,
        path: `${apiPath}${search}`,
        statusCode: 502,
        success: false,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        requestBody: parseBody(rawBody),
        responseBody: {
          error: err instanceof Error ? err.message : "Upstream unreachable",
        },
      });
    }
    return NextResponse.json(
      { error: "Attendance server unreachable" },
      { status: 502 }
    );
  }

  const responseText = await upstream.text();

  if (write) {
    const classified = classifyWrite(method, apiPath);
    await writeAuditLog({
      actor: caller.actor,
      ...classified,
      method,
      path: `${apiPath}${search}`,
      statusCode: upstream.status,
      success: upstream.ok,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
      requestBody: parseBody(rawBody),
      responseBody: parseBody(responseText),
    });
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
