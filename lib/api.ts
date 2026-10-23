// Base URL of the backend API server, read from the required BACKEND_API_URL
// environment variable. next.config.ts inlines it into the client bundle at
// build time (via the `env` config option), so it is available here in client
// components too.
const BACKEND_BASE_URL = (process.env.BACKEND_API_URL ?? "").replace(/\/+$/, "");

/**
 * Builds a URL to the ADMS API. In the browser this is the same-origin
 * `/api/adms/*` proxy so the signed-in user is attached and writes are
 * audited. Server-side callers still hit the backend origin directly.
 */
export function apiUrl(path: string): string {
  const raw = path.startsWith("/") ? path : `/${path}`;
  const qIndex = raw.indexOf("?");
  const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const search = qIndex === -1 ? "" : raw.slice(qIndex);
  const rest = pathname.replace(/^\/api\/?/, "");
  if (typeof window !== "undefined") {
    return `/api/adms/${rest}${search}`;
  }
  return `${BACKEND_BASE_URL}/api/${rest}${search}`;
}

/**
 * Parse a fetch Response as JSON. If the body is not JSON (e.g. the ADMS
 * catch-all plain-text "OK"), throw a clear Error instead of a SyntaxError.
 */
export async function readApiJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      res.ok
        ? "Empty response from API"
        : `API error ${res.status}: empty body`
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const preview =
      trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
    throw new Error(
      `API returned non-JSON (${res.status}): ${preview}. ` +
        "If this is /api/batches, redeploy fingerprint-server with the batches routes."
    );
  }
}
