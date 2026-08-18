// The internal auto-increment `id` never leaves this service — every
// response substitutes the non-sequential `uuid` in its place so a
// listing's identifier can't be enumerated (see docs/SWAYAM_PLUS_INTEGRATION_SPEC.md
// review notes on IDOR/enumeration). Callers pass an already-plain object
// (row.get({ plain: true })), including nested `internship` includes on
// other models.
export function serializeInternship(
  plain: Record<string, unknown> & { id: number; uuid: string },
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const { id: _internalId, uuid, ...rest } = plain;
  return { ...rest, id: uuid, ...extra };
}
