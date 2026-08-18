// Splits a comma-joined multi-select query value (e.g. `category=Software+
// Development,Web+Development`) back into an array before validation — the
// shape every multi-select filter sidebar in this app sends. A bare single
// value still works the same way (a one-element array). Shared by any DTO
// with a comma-joined multi-select filter (see query-internships.dto.ts,
// query-candidates.dto.ts).
export function toArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const items = raw.map((v) => String(v).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}
