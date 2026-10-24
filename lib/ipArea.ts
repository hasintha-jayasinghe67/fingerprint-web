/**
 * General area for an IP address (city, region, country).
 * This is not a device GPS lookup. Private addresses stay on the local network.
 * Results are cached for the life of the server process.
 */

const cache = new Map<string, string>();
const LOOKUP_LIMIT = 4;
const LOOKUP_TIMEOUT_MS = 2500;

export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (!ip) return null;
  if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }
  return ip || null;
}

function isLocalNetwork(ip: string): boolean {
  const value = ip.toLowerCase();
  if (
    value === "::1" ||
    value === "127.0.0.1" ||
    value === "0.0.0.0" ||
    value === "localhost"
  ) {
    return true;
  }
  if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function formatArea(data: {
  city?: string;
  region?: string;
  country?: string;
}): string {
  const parts = [data.city, data.region, data.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
      unique.push(part);
    }
  }
  return unique.join(", ");
}

async function lookupPublicIp(
  ip: string
): Promise<{ area: string; cacheable: boolean }> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return { area: "Unknown area", cacheable: false };
    const data = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
    };
    if (!data.success) return { area: "Unknown area", cacheable: true };
    return { area: formatArea(data) || "Unknown area", cacheable: true };
  } catch {
    return { area: "Unknown area", cacheable: false };
  }
}

async function resolveOne(ip: string): Promise<string> {
  const cached = cache.get(ip);
  if (cached) return cached;
  if (isLocalNetwork(ip)) {
    cache.set(ip, "Local network");
    return "Local network";
  }
  const result = await lookupPublicIp(ip);
  if (result.cacheable) cache.set(ip, result.area);
  return result.area;
}

/** Map of normalized IP → general area. Missing and local addresses are labeled. */
export async function describeAreas(
  ips: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const unique: string[] = [];
  for (const raw of ips) {
    const ip = normalizeIp(raw);
    if (!ip || unique.includes(ip)) continue;
    unique.push(ip);
  }

  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const ip = unique[cursor];
      cursor += 1;
      await resolveOne(ip);
    }
  }
  const workers = Math.min(LOOKUP_LIMIT, unique.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));

  const out = new Map<string, string>();
  for (const ip of unique) {
    out.set(ip, cache.get(ip) || "Unknown area");
  }
  return out;
}

export function areaForIp(
  areas: Map<string, string>,
  raw: string | null | undefined
): string | null {
  const ip = normalizeIp(raw);
  if (!ip) return null;
  return areas.get(ip) || "Unknown area";
}
