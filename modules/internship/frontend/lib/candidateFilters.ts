// The employer-facing mirror of internshipFilters.ts — same shape, pointed
// at /employer/candidates instead. Kept as its own module rather than
// reusing buildInternshipsHref directly: that function's target path is
// baked in, not a parameter.
export type CandidateFilterParams = Record<string, string | undefined>;

export const CANDIDATE_FILTER_KEYS = [
  'q',
  'location',
  'category',
  'mode',
  'employmentType',
  'activeOnly',
  'sort',
] as const;

export type CandidateFilterKey = (typeof CANDIDATE_FILTER_KEYS)[number];

export function buildCandidatesHref(
  current: CandidateFilterParams,
  overrides: Partial<Record<CandidateFilterKey | 'page', string | undefined>> = {},
): string {
  const merged: CandidateFilterParams = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const key of CANDIDATE_FILTER_KEYS) {
    if (merged[key]) params.set(key, merged[key] as string);
  }
  if (overrides.page && overrides.page !== '1') {
    params.set('page', overrides.page);
  }
  const qs = params.toString();
  return `/employer/candidates${qs ? `?${qs}` : ''}`;
}
