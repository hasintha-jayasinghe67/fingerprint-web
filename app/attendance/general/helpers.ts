export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getTodaySriLankanDateISO(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const slMs = utcMs + 5.5 * 3600000;
  const slDate = new Date(slMs);
  const y = slDate.getFullYear();
  const m = String(slDate.getMonth() + 1).padStart(2, "0");
  const d = String(slDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function avatarChar(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

export interface MatchablePrefect {
  prefectId: number;
  pin: string;
  name: string;
  class: string | null;
  code: string | null;
}

export function isExcusedStatus(status: string | null | undefined): boolean {
  return status === "EG" || status === "ES" || status === "Excused";
}

export function normalizePrefectMatchKey(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Split pasted present/excused text into individual prefect lookup tokens.
 * Handles newline-separated lists, numbered/bulleted lists (e.g. "1. Name - 10A"),
 * comma/semicolon/tab-separated lists, and multi-code lines (e.g. "AMR 137 LEN 146").
 */
export function parsePrefectListTokens(text: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  const add = (raw: string) => {
    const cleaned = raw
      .replace(/^\s*(?:\d+\s*[\.\)\-:]\s+|[-•*]\s+)/, "")
      .trim();
    if (!cleaned) return;
    const key = normalizePrefectMatchKey(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    tokens.push(cleaned);
  };

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const strippedLine = rawLine
      .replace(/^\s*(?:\d+\s*[\.\)\-:]\s+|[-•*]\s+)/, "")
      .trim();
    if (!strippedLine) continue;

    const codeRuns = strippedLine.match(/[A-Za-z]{2,}\s*\d+/g);
    if (codeRuns && codeRuns.length >= 2) {
      for (const run of codeRuns) add(run);
      continue;
    }

    for (const part of strippedLine.split(/[,;\t]+/)) {
      add(part);
    }
  }

  return tokens;
}

function buildPrefectMatchIndexes(prefects: MatchablePrefect[]) {
  const byExact = new Map<string, number[]>();
  const bySurname = new Map<string, number[]>();
  const byCodeDigits = new Map<string, number[]>();

  const push = (map: Map<string, number[]>, key: string, id: number) => {
    if (!key) return;
    const list = map.get(key);
    if (list) {
      if (!list.includes(id)) list.push(id);
    } else {
      map.set(key, [id]);
    }
  };

  for (const p of prefects) {
    push(byExact, normalizePrefectMatchKey(p.name), p.prefectId);
    push(byExact, normalizePrefectMatchKey(p.pin), p.prefectId);
    if (p.class) {
      push(byExact, normalizePrefectMatchKey(`${p.name} ${p.class}`), p.prefectId);
    }
    if (p.code) {
      const codeKey = normalizePrefectMatchKey(p.code);
      push(byExact, codeKey, p.prefectId);
      const digits = codeKey.replace(/^[a-z]+/, "");
      if (digits) push(byCodeDigits, digits, p.prefectId);
    }

    const parts = String(p.name || "").trim().split(/\s+/);
    const surname = parts.length ? parts[parts.length - 1] : "";
    push(bySurname, normalizePrefectMatchKey(surname), p.prefectId);
  }

  return { byExact, bySurname, byCodeDigits };
}

function resolvePrefectToken(
  token: string,
  indexes: ReturnType<typeof buildPrefectMatchIndexes>
): number | null {
  const unique = (ids: number[] | undefined): number | null =>
    ids && ids.length === 1 ? ids[0] : null;

  const tryKey = (raw: string): number | null => {
    const key = normalizePrefectMatchKey(raw);
    if (!key) return null;

    const exact = unique(indexes.byExact.get(key));
    if (exact != null) return exact;

    if (/^\d+$/.test(key)) {
      const byDigits = unique(indexes.byCodeDigits.get(key));
      if (byDigits != null) return byDigits;
    }

    const bySurname = unique(indexes.bySurname.get(key));
    if (bySurname != null) return bySurname;

    return null;
  };

  const direct = tryKey(token);
  if (direct != null) return direct;

  // Strip optional trailing " - <class>" suffix (e.g. "H. Perera - 10A")
  const withoutClass = token.replace(/\s+[-–—]\s+\S+.*$/, "").trim();
  if (withoutClass && withoutClass !== token) {
    const stripped = tryKey(withoutClass);
    if (stripped != null) return stripped;
  }

  return null;
}

export function matchPrefectList(
  text: string,
  prefects: MatchablePrefect[]
): { matchedIds: Set<number>; unmatchedTokens: string[] } {
  const tokens = parsePrefectListTokens(text);
  const indexes = buildPrefectMatchIndexes(prefects);
  const matchedIds = new Set<number>();
  const unmatchedTokens: string[] = [];

  for (const token of tokens) {
    const id = resolvePrefectToken(token, indexes);
    if (id != null) {
      matchedIds.add(id);
    } else {
      unmatchedTokens.push(token);
    }
  }

  return { matchedIds, unmatchedTokens };
}

