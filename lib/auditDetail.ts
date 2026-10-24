/**
 * Turns a write into a sentence a superuser can read without opening the
 * raw body: which record, and for an update, which fields changed.
 */

type Json = Record<string, unknown>;

const SUMMARY_LIMIT = 700;
const CHANGE_LIMIT = 8;

const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

function asRecord(value: unknown): Json | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Json;
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function quote(value: unknown): string {
  const raw = text(value);
  return raw ? `“${raw}”` : "empty";
}

function clip(summary: string): string {
  if (summary.length <= SUMMARY_LIMIT) return summary;
  return `${summary.slice(0, SUMMARY_LIMIT - 1)}…`;
}

function joinChanges(changes: string[]): string {
  if (changes.length === 0) return "";
  if (changes.length <= CHANGE_LIMIT) return changes.join("; ");
  const extra = changes.length - CHANGE_LIMIT;
  return `${changes.slice(0, CHANGE_LIMIT).join("; ")}; +${extra} more`;
}

function changed(label: string, before: unknown, after: unknown): string | null {
  const left = text(before);
  const right = text(after);
  if (left === right) return null;
  return `${label} ${quote(left)} → ${quote(right)}`;
}

function pathId(path: string, index: number): string {
  return path.split("/").filter(Boolean)[index] || "";
}

function entriesOf(value: unknown): Json[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as Json[];
}

function statusChanges(beforeRows: Json[], afterRows: Json[]): string[] {
  const before = new Map<number, Json>();
  for (const row of beforeRows) {
    const id = Number(row.prefectId ?? row.prefect_id);
    if (Number.isInteger(id) && id > 0) before.set(id, row);
  }
  const changes: string[] = [];
  for (const row of afterRows) {
    const id = Number(row.prefectId ?? row.prefect_id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const prior = before.get(id);
    const from = text(prior?.status) || "To be marked";
    const to = text(row.status);
    if (!to || from === to) continue;
    const label =
      text(prior?.code) ||
      text(prior?.name) ||
      text(row.code) ||
      text(row.name) ||
      `prefect ${id}`;
    changes.push(`${label} ${from} → ${to}`);
  }
  return changes;
}

function eventRecord(source: Json | null, fallback = "special event"): string {
  const name = text(source?.name);
  return name ? `special event ${quote(name)}` : fallback;
}

function eventChanges(before: Json | null, after: Json | null): string[] {
  if (!before || !after) return [];
  return [
    changed("name", before.name, after.name),
    changed("sign-in start", before.startAt ?? before.start_at, after.startAt ?? after.start_at),
    changed("sign-in end", before.endAt ?? before.end_at, after.endAt ?? after.end_at),
  ].filter((line): line is string => Boolean(line));
}

export function enrichAuditSummary(
  fallback: string,
  input: {
    method: string;
    path: string;
    requestBody: unknown;
    responseBody: unknown;
    previous: unknown;
    ok: boolean;
  }
): string {
  const path = input.path.replace(/\?.*$/, "");
  const request = asRecord(input.requestBody);
  const response = asRecord(input.responseBody);
  const previous =
    asRecord(input.previous) || asRecord(response?.previous) || null;
  const detail = describe(input.method, path, request, response, previous);
  const summary = detail || fallback;
  if (input.ok) return clip(summary);
  const error = text(response?.error);
  return clip(error ? `${summary} — failed: ${error}` : summary);
}

function describe(
  method: string,
  path: string,
  request: Json | null,
  response: Json | null,
  previous: Json | null
): string | null {
  const verb = method.toUpperCase();

  if (/^\/api\/special-events\/?$/.test(path) && verb === "POST") {
    const name = text(response?.name) || text(request?.name);
    const start = text(response?.startAt) || text(request?.startAt);
    const end = text(response?.endAt) || text(request?.endAt);
    const window = start && end ? ` (${start} – ${end})` : "";
    return name
      ? `Created special event ${quote(name)}${window}`
      : "Created a special event";
  }

  if (/^\/api\/special-events\/[^/]+$/.test(path) && verb === "PUT") {
    const next = {
      name: text(response?.name) || text(request?.name),
      startAt: text(response?.startAt) || text(request?.startAt),
      endAt: text(response?.endAt) || text(request?.endAt),
    };
    const before = previous;
    const changes = eventChanges(before, next);
    const record = eventRecord(
      next.name ? next : before,
      `special event ${pathId(path, 2)}`
    );
    return changes.length
      ? `Updated ${record}: ${joinChanges(changes)}`
      : `Updated ${record}`;
  }

  if (/^\/api\/special-events\/[^/]+$/.test(path) && verb === "DELETE") {
    const record = eventRecord(response?.name ? response : previous, `special event ${pathId(path, 2)}`);
    return `Deleted ${record}`;
  }

  if (/^\/api\/special-events\/[^/]+\/excuses$/.test(path) && verb === "POST") {
    const name = text(response?.eventName);
    const record = name ? `special event ${quote(name)}` : `special event ${pathId(path, 2)}`;
    const present = response?.present;
    const excused = response?.excused;
    const traitors = response?.traitors;
    const counts =
      present != null
        ? `: ${present} present, ${excused} excused, ${traitors} traitors`
        : "";
    return `Saved excuses for ${record}${counts}`;
  }

  if (/^\/api\/general-attendance\/?$/.test(path) && verb === "POST") {
    const name = text(response?.name) || text(request?.name);
    const date = text(response?.date) || text(request?.date);
    return `Created general attendance ${quote(name || "record")}${date ? ` on ${date}` : ""}`;
  }

  if (/^\/api\/general-attendance\/[^/]+$/.test(path) && verb === "PUT") {
    const name = text(response?.name) || text(request?.name) || text(previous?.name);
    const date = text(response?.date) || text(request?.date) || text(previous?.date);
    const changes = [
      changed("name", previous?.name, name),
      changed("date", previous?.date, date),
      ...statusChanges(entriesOf(previous?.entries), entriesOf(request?.entries)),
    ].filter((line): line is string => Boolean(line));
    const record = `general attendance ${quote(name || pathId(path, 2))}${date ? ` (${date})` : ""}`;
    return changes.length
      ? `Updated ${record}: ${joinChanges(changes)}`
      : `Updated ${record}`;
  }

  const gateDate = path.match(/^\/api\/gate-attendance\/([^/]+)$/);
  if (gateDate && verb === "POST") {
    const changes = statusChanges(
      entriesOf(previous?.gateEntries),
      entriesOf(request?.entries)
    );
    const record = `gate attendance for ${gateDate[1]}`;
    return changes.length
      ? `Saved ${record}: ${joinChanges(changes)}`
      : `Saved ${record}`;
  }

  const gateExcuses = path.match(/^\/api\/gate-attendance\/([^/]+)\/excuses$/);
  if (gateExcuses) {
    return `Applied gate excuses for ${gateExcuses[1]}`;
  }

  const slot = path.match(/^\/api\/slot-attendance\/([^/]+)\/([^/]+)$/);
  if (slot && verb === "POST") {
    return `Saved ${slot[2]} attendance for ${slot[1]}`;
  }

  if (/^\/api\/prefects\/?$/.test(path) && verb === "POST") {
    const name = text(response?.name) || text(request?.name);
    const code = text(response?.code) || text(request?.code);
    return `Added prefect ${quote(name)}${code ? ` (${code})` : ""}`;
  }

  if (/^\/api\/prefects\/[^/]+$/.test(path) && verb === "PUT") {
    const next = response || request;
    const changes = [
      changed("name", previous?.name, next?.name),
      changed("class", previous?.class, next?.class),
      changed("code", previous?.code, next?.code),
      changed("PIN", previous?.pin, next?.pin),
    ].filter((line): line is string => Boolean(line));
    const record = `prefect ${quote(text(next?.name) || text(previous?.name) || pathId(path, 2))}`;
    return changes.length ? `Updated ${record}: ${joinChanges(changes)}` : `Updated ${record}`;
  }

  if (/^\/api\/prefects\/[^/]+$/.test(path) && verb === "DELETE") {
    const name = text(response?.name) || text(previous?.name);
    const code = text(response?.code) || text(previous?.code);
    return `Deleted prefect ${quote(name || pathId(path, 2))}${code ? ` (${code})` : ""}`;
  }

  if (/\/register-device$/.test(path)) {
    return `Queued fingerprint enrollment for prefect ${pathId(path, 2)}`;
  }
  if (/\/unregister-device$/.test(path)) {
    return `Queued fingerprint removal for prefect ${pathId(path, 2)}`;
  }

  if (/^\/api\/batches\/[^/]+$/.test(path) && verb === "PUT") {
    const next = asRecord(response?.batch) || response || request;
    const before = asRecord(previous?.batch) || previous;
    const changes = [
      changed("name", before?.name, next?.name),
      changed(
        "morning sign-in",
        before?.morningSigninTime,
        next?.morningSigninTime ?? request?.morningSigninTime
      ),
      changed("extended", before?.extended, next?.extended ?? request?.extended),
    ].filter((line): line is string => Boolean(line));
    const record = `batch ${quote(text(next?.name) || text(before?.name) || pathId(path, 2))}`;
    return changes.length ? `Updated ${record}: ${joinChanges(changes)}` : `Updated ${record}`;
  }
  if (/^\/api\/batches\/[^/]+$/.test(path) && verb === "DELETE") {
    const before = asRecord(previous?.batch) || previous;
    const name = text(response?.name) || text(before?.name);
    return `Deleted batch ${quote(name || pathId(path, 2))}`;
  }
  if (/^\/api\/batches\/?$/.test(path) && verb === "POST") {
    const created = asRecord(response?.batch);
    return `Created batch ${quote(text(created?.name) || text(request?.name))}`;
  }

  if (path === "/api/settings" && verb === "PUT") {
    const before = new Map(
      entriesOf(asRecord(previous?.settings)?.batches).map((row) => [Number(row.id), row])
    );
    const changes: string[] = [];
    for (const row of entriesOf(request?.batches)) {
      const prior = before.get(Number(row.id));
      const line = changed(
        text(prior?.name) || `batch ${row.id}`,
        prior?.morningSigninTime,
        row.morningSigninTime
      );
      if (line) changes.push(line);
    }
    return changes.length
      ? `Updated sign-in settings: ${joinChanges(changes)}`
      : "Updated sign-in settings";
  }

  if (path === "/api/gate-sheet" && verb === "PUT") {
    const before = new Map(
      entriesOf(previous?.rows).map((row) => [Number(row.prefectId), row])
    );
    const changes: string[] = [];
    for (const row of entriesOf(request?.rows)) {
      const prior = before.get(Number(row.prefectId));
      const priorDays = asRecord(prior?.days) || {};
      const nextDays = asRecord(row.days) || {};
      for (let day = 1; day <= 5; day += 1) {
        const line = changed(
          `${text(prior?.name) || text(prior?.code) || `prefect ${row.prefectId}`} ${WEEKDAYS[day]}`,
          priorDays[day] ?? priorDays[String(day)],
          nextDays[day] ?? nextDays[String(day)]
        );
        if (line) changes.push(line);
      }
    }
    return changes.length
      ? `Updated gate sheet: ${joinChanges(changes)}`
      : "Updated gate sheet";
  }

  if (/^\/api\/leave-excuses\/?$/.test(path) && verb === "POST") {
    const type = text(request?.excuseType).toUpperCase();
    const start = text(request?.startDate);
    const end = text(request?.endDate);
    const count = Array.isArray(request?.prefectIds) ? request.prefectIds.length : 0;
    return `Logged ${type || "leave"} excuse ${start} – ${end} (${count} prefect${count === 1 ? "" : "s"})`;
  }

  if (/^\/api\/leave-excuses\/[^/]+$/.test(path) && verb === "PUT") {
    const next = asRecord(response?.excuse) || request;
    const before = previous;
    const changes = [
      changed("type", before?.excuseType, next?.excuseType),
      changed("start", before?.startDate, next?.startDate),
      changed("end", before?.endDate, next?.endDate),
      changed("reason", before?.reason, next?.reason),
    ].filter((line): line is string => Boolean(line));
    const beforeIds = Array.isArray(before?.prefectIds) ? before.prefectIds.map(Number) : [];
    const afterIds = Array.isArray(next?.prefects)
      ? (next.prefects as Json[]).map((row) => Number(row.id))
      : Array.isArray(request?.prefectIds)
        ? request.prefectIds.map(Number)
        : [];
    if (beforeIds.length && afterIds.join(",") !== beforeIds.join(",")) {
      changes.push(`prefects ${beforeIds.length} → ${afterIds.length}`);
    }
    const record = `leave excuse ${text(next?.startDate) || pathId(path, 2)} – ${text(next?.endDate)}`;
    return changes.length ? `Updated ${record}: ${joinChanges(changes)}` : `Updated ${record}`;
  }

  if (/^\/api\/leave-excuses\/[^/]+$/.test(path) && verb === "DELETE") {
    const before = previous;
    const range =
      text(before?.startDate) && text(before?.endDate)
        ? `${before?.startDate} – ${before?.endDate}`
        : pathId(path, 2);
    const type = text(before?.excuseType).toUpperCase();
    return `Deleted ${type ? `${type} ` : ""}leave excuse ${range}`;
  }

  if (path === "/api/tie-duties" && verb === "POST") {
    const date = text(response?.dutyDate) || text(request?.dutyDate);
    return `Saved tie duty${date ? ` for ${date}` : ""}`;
  }
  if (path === "/api/tie-duties/draw" && verb === "POST") {
    const date = text(request?.dutyDate) || text(response?.dutyDate);
    return `Drew tie duty${date ? ` for ${date}` : ""}`;
  }
  if (/^\/api\/tie-duties\/[^/]+$/.test(path) && verb === "DELETE") {
    const date = text(response?.dutyDate) || text(previous?.dutyDate);
    return `Deleted tie duty${date ? ` for ${date}` : ` ${pathId(path, 2)}`}`;
  }

  if (/^\/api\/prefects\/[^/]+\/suspensions$/.test(path) && verb === "POST") {
    const start = text(request?.startDate);
    const end = text(request?.endDate);
    return `Added a suspension for prefect ${pathId(path, 2)}${start ? ` (${start}${end ? ` – ${end}` : ""})` : ""}`;
  }
  if (/^\/api\/suspensions\/[^/]+$/.test(path) && verb === "PUT") {
    const next = asRecord(response?.suspension) || request;
    const before = asRecord(response?.previous) || previous;
    const changes = [
      changed("start", before?.startDate, next?.startDate),
      changed("end", before?.endDate, next?.endDate),
      changed("reason", before?.reason, next?.reason),
    ].filter((line): line is string => Boolean(line));
    const record = `suspension ${pathId(path, 2)}`;
    return changes.length ? `Updated ${record}: ${joinChanges(changes)}` : `Updated ${record}`;
  }
  if (/^\/api\/suspensions\/[^/]+$/.test(path) && verb === "DELETE") {
    const before = asRecord(response?.previous) || previous;
    const range = text(before?.startDate)
      ? ` (${before?.startDate}${text(before?.endDate) ? ` – ${before?.endDate}` : ""})`
      : "";
    return `Deleted suspension ${pathId(path, 2)}${range}`;
  }

  if (/^\/api\/late-excusals/.test(path)) {
    const who = text(request?.prefectId) || text(request?.pin) || text(request?.name);
    if (verb === "DELETE") {
      return who ? `Removed a late excuse for ${who}` : "Removed a late excuse";
    }
    return who ? `Excused a late sign-in for ${who}` : "Excused a late sign-in";
  }

  return null;
}
