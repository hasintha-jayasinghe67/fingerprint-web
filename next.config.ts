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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.55"],
  // Inline the backend URL into the client bundle at build time so client
  // components can call <BACKEND_API_URL>/api/* directly (see lib/api.ts).
  env: {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
