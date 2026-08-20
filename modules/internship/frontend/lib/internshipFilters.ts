// Single source for building a /internships URL from the current filter
// state plus overrides — used by every filter control (sidebar links, search,
// sort, active-filter chips, pagination) so they all agree on which params
// exist and in what order, instead of each re-implementing this.
export type InternshipFilterParams = Record<string, string | undefined>;

// A single "at least ₹X/month" floor, not a two-handle range — nobody
// filters out a *higher*-paying internship. Presets over a slider since
// there's no slider primitive anywhere in this codebase, and these four
// values cover the real decision a student is making well enough. Shared
// between the browse page's stipend filter (FilterSidebar) and the
// preferences form's "minimum expected stipend" (PreferencesCard) so the
// two stay in the same vocabulary — a preference and a filter mean the same
// thing here (see StudentPreference.minExpectedStipend).
export const STIPEND_PRESETS = [
  { label: '₹2,000+', value: '2000' },
  { label: '₹5,000+', value: '5000' },
  { label: '₹10,000+', value: '10000' },
  { label: '₹15,000+', value: '15000' },
] as const;

export const FILTER_KEYS = [
  'q',
  'location',
  'category',
  'mode',
  'employmentType',
  'educationLevel',
  'stream',
  'experienceRequired',
  'paid',
  'stipendMin',
  'sort',
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

// category/mode/employmentType/educationLevel/stream are multi-select in the
// UI (see FilterSidebar.tsx) but stay single query-string values — a
// selection is comma-joined into one param rather than repeating the key,
// so every other consumer here (buildInternshipsHref, Pagination, SortSelect)
// keeps treating params as plain strings with no change. The backend splits
// the same way (see QueryInternshipsDto's toArray transform).
export function parseMultiValue(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function serializeMultiValue(values: string[]): string | undefined {
  return values.length > 0 ? values.join(',') : undefined;
}

// A filter change resets to page 1 (the old result set's page 2 may not
// exist in the new one) unless the caller explicitly overrides `page` too —
// e.g. Pagination does, everything else doesn't need to.
export function buildInternshipsHref(
  current: InternshipFilterParams,
  overrides: Partial<Record<FilterKey | 'page', string | undefined>> = {},
): string {
  const merged: InternshipFilterParams = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (merged[key]) params.set(key, merged[key] as string);
  }
  // `page` only ever comes from an explicit override (Pagination passes the
  // target page) — it's never carried over implicitly from `current`, so
  // every other filter/search/sort change naturally resets to page 1
  // instead of landing on a page that may not exist in the new result set.
  if (overrides.page && overrides.page !== '1') {
    params.set('page', overrides.page);
  }
  const qs = params.toString();
  return `/internships/browse${qs ? `?${qs}` : ''}`;
}
