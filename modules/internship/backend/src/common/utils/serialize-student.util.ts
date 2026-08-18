// Mirrors serializeInternship's (plain, extra) shape. Student has no public
// uuid (unlike Internship) — every caller of this util is already
// role-gated to authenticated, verified employers rather than the general
// public, so there's no enumeration surface to protect with an opaque id
// the way there is for public internship listings.
export function serializeStudent(
  plain: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...plain, ...extra };
}
