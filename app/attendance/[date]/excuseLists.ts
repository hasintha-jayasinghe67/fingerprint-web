import type { GateEntry } from "./types";

/** Rebuild an ES/EG textarea from prefects currently marked with that status. */
export function buildExcuseListFromStatuses(
  entries: GateEntry[],
  statusOf: (entry: GateEntry) => string,
  status: "ES" | "EG"
): string {
  return entries
    .filter((entry) => statusOf(entry) === status)
    .map((entry) => (entry.code || entry.name || entry.pin).trim())
    .filter(Boolean)
    .join("\n");
}

/** Merge leave-excuse prefill lines with statuses already marked ES/EG. */
export function mergeExcuseLists(...lists: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const list of lists) {
    for (const raw of String(list || "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const key = line.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }
  return lines.join("\n");
}
