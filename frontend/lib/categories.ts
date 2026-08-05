// Mirrors backend/src/common/constants/categories.ts — kept in sync manually
// since there's no shared package between the two apps yet.
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

// The 4 pastel tones from the design system's feature-card grid, cycled across
// the category chip row so it reads as one system rather than a flat list.
const PASTEL_CYCLE = ['yellow', 'peach', 'lavender', 'mint'] as const;
export type PastelTone = (typeof PASTEL_CYCLE)[number];

export function pastelForIndex(index: number): PastelTone {
  return PASTEL_CYCLE[index % PASTEL_CYCLE.length];
}
