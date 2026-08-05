// Closed taxonomy — drives category validation, the browse-page chip row, and
// the post-internship form's category dropdown. Extend the list if needed, but
// keep it closed rather than free text (unlike skillTags/eligibility).
export const INTERNSHIP_CATEGORIES = [
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
] as const;

export type InternshipCategory = (typeof INTERNSHIP_CATEGORIES)[number];
