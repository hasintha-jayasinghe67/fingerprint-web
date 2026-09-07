import type { NextConfig } from "next";

// Base URL of the backend API server. It is required and read exclusively
// from the BACKEND_API_URL env var (see .env.example) — there is no
// hardcoded default, so the same build can be deployed anywhere.
const backendApiUrlEnv = process.env.BACKEND_API_URL?.trim();

if (!backendApiUrlEnv) {
  throw new Error(
    "BACKEND_API_URL is not set. Point it at your backend API origin, " +
      "e.g. BACKEND_API_URL=http://localhost:8088 (see .env.example)."
  );
}

// Trailing slashes are stripped before building the rewrite destination.
const backendApiUrl = backendApiUrlEnv.replace(/\/+$/, "");

function originOrFallback(
  url: string | undefined,
  fallback: string
): string {
  if (!url) return fallback;
  try {
    return new URL(url).origin;
  } catch {
    return fallback;
  }
}

const supabaseOrigin = originOrFallback(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://*.supabase.co"
);
const backendOrigin = originOrFallback(backendApiUrl, "");

/**
 * Security headers applied to every response. Pin connect-src / img-src to
 * Supabase and the ADMS backend so the browser may only talk to those origins.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${supabaseOrigin}${backendOrigin ? ` ${backendOrigin}` : ""}`,
      `img-src 'self' data: ${supabaseOrigin}`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.55"],
  // Inline the backend URL into the client bundle at build time so client
  // components can call <BACKEND_API_URL>/api/* directly (see lib/api.ts).
  env: {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Proxy ADMS backend APIs, but never /api/users* (Next.js user-management
    // routes). Clients already call the backend via apiUrl() for product APIs;
    // this rewrite remains for any relative /api/* hits.
    return [
      {
        source: "/api/:path((?!users(?:/.*)?$).*)",
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
