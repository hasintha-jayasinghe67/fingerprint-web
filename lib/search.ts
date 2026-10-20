/** Case-insensitive substring match across one or more fields. */
export function matchesSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) =>
    String(field ?? "")
      .toLowerCase()
      .includes(q)
  );
}
