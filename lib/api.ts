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