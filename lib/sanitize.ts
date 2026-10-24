/**
 * Clean values before they are stored or forwarded.
 * Text is trimmed, stripped of control characters and HTML tags.
 * Passwords only lose nulls and control characters, so a character
 * the person chose is not rewritten.
 */

const SECRET_KEYS = new Set([
  "password",
  "confirmPassword",
  "currentPassword",
  "newPassword",
  "confirm",
]);

const MAX_TEXT = 20_000;
const MAX_SECRET = 1_024;

export function sanitizeText(value: string): string {
  let text = value.replace(/\u0000/g, "");
  text = text.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  text = text.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, "");
  text = text.normalize("NFKC");
  text = text.replace(/<\/?[a-z][^>\n]*>/gi, "");
  text = text.trim();
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  return text;
}

export function sanitizeSecret(value: string): string {
  let text = value.replace(/\u0000/g, "");
  text = text.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (text.length > MAX_SECRET) text = text.slice(0, MAX_SECRET);
  return text;
}

export function sanitizeData(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key && SECRET_KEYS.has(key) ? sanitizeSecret(value) : sanitizeText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeData(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [childKey, nested] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = sanitizeData(nested, childKey);
    }
    return out;
  }
  return value;
}

/** Rebuild a query string with each key and value cleaned. */
export function sanitizeSearch(search: string): string {
  if (!search || search === "?") return "";
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    next.append(sanitizeText(key), sanitizeText(value));
  }
  const encoded = next.toString();
  return encoded ? `?${encoded}` : "";
}
