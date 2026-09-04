import type { NextConfig } from "next";

// Base URL of the backend API server. Override it per environment via the
// BACKEND_API_URL env var (see .env.example) so the same build can be
// deployed anywhere. Trailing slashes are stripped before building the
// rewrite destination.
const backendApiUrl = (
  process.env.BACKEND_API_URL ?? "http://localhost:8088"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.55"],
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
