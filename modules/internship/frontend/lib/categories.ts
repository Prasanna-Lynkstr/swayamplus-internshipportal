// Categories themselves are admin-managed now (GET /taxonomies/internship_category
// via useTaxonomy('internship_category') — see lib/useTaxonomy.ts), not a
// hardcoded array. This file keeps only the presentational helper (icon)
// that keys off a category's value; unknown/new categories an admin adds
// fall back to a generic icon rather than needing a code change.

const CATEGORY_ICONS: Record<string, string> = {
  'Data Analysis': '📊',
  'Data Science': '🧠',
  'Software Development': '💻',
  'Web Development': '🌐',
  'Digital Marketing': '📣',
  'UI/UX Design': '🎨',
  HR: '🧑‍💼',
  'Content Writing': '✍️',
  'Sales & Business Development': '📈',
  'Finance & Accounting': '💰',
  Operations: '⚙️',
  Other: '🏷️',
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '🏷️';
}
