// The 5 content taxonomies made admin-manageable in Phase 0 (see
// docs/V1_RELEASE_SPEC.md §14) — closed lists of business values with no code
// branching per value. This file is ONLY the one-time seed used to populate
// `taxonomy_values` when a list is empty (fresh database, or a list an admin
// hasn't touched yet); after that, the database is the source of truth, not
// this file. Do not import these arrays for validation — use
// TaxonomiesService.assertValid() instead.
export const TAXONOMY_LIST_KEYS = [
  'internship_category',
  'work_mode',
  'employment_type',
  'schedule_type',
  'paid_preference',
] as const;

export type TaxonomyListKey = (typeof TAXONOMY_LIST_KEYS)[number];

export function isTaxonomyListKey(key: string): key is TaxonomyListKey {
  return (TAXONOMY_LIST_KEYS as readonly string[]).includes(key);
}

interface TaxonomySeedValue {
  value: string;
  label: string;
}

export const TAXONOMY_DEFAULT_SEED: Record<TaxonomyListKey, TaxonomySeedValue[]> = {
  internship_category: [
    'Data Analysis',
    'Data Science',
    'Software Development',
    'Web Development',
    'Digital Marketing',
    'UI/UX Design',
    'HR',
    'Content Writing',
    'Sales & Business Development',
    'Finance & Accounting',
    'Operations',
    'Other',
  ].map((label) => ({ value: label, label })),
  work_mode: [
    { value: 'remote', label: 'Remote' },
    { value: 'onsite', label: 'Onsite' },
    { value: 'hybrid', label: 'Hybrid' },
  ],
  employment_type: [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
  ],
  schedule_type: [
    { value: 'flexible', label: 'Flexible' },
    { value: 'fixed', label: 'Fixed' },
  ],
  paid_preference: [
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'either', label: 'Either' },
  ],
};
