// Base URL of the backend API server, read from the required BACKEND_API_URL
// environment variable. next.config.ts inlines it into the client bundle at
// build time (via the `env` config option), so it is available here in client
// components too.
const BACKEND_BASE_URL = (process.env.BACKEND_API_URL ?? "").replace(/\/+$/, "");

/**
 * Builds an absolute URL to the backend API. Every /api/* request in the app
 * must go through this helper so the browser calls <BACKEND_API_URL>/api/*
 * directly instead of a relative path that depends on a server-side rewrite.
 */
export function apiUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
