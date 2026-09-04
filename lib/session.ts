// Server-only session helpers for the login gate.
//
// NOTE: Do not import this module from client components. It uses the Node
// `crypto` module and is imported by `proxy.ts` (Node runtime in Next 16) and
// the server actions in `app/login/actions.ts`.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "hpa_session";

// Fallback for local/demo use; set SESSION_SECRET in production.
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "house-prefect-affairs-demo-secret";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

/**
 * Returns a signed session token. The payload is just the expiry timestamp —
 * there is a single hardcoded admin account, so no user data is needed.
 * Format: "<expiryMs>.<hmac-sha256(payload)>" (base64url has no ".", so the
 * last dot unambiguously separates payload from signature).
 */
export function createSessionToken(): string {
  const payload = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${payload}.${sign(payload)}`;
}

/** Verifies a session token's signature and expiry. */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expected = sign(payload);

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return false;

  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry > Date.now();
}
