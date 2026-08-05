import type { InternshipMode } from './types';

// Single source for the mode → icon association. The label text intentionally
// differs by context (a compact list row vs. the detail page's fuller
// "Work from Home" copy), so callers pick a variant rather than this module
// forcing one wording on both.
const MODE_ICON: Record<InternshipMode, string> = {
  remote: '🏠',
  onsite: '🏢',
  hybrid: '🔀',
};

const MODE_TEXT: Record<'short' | 'full', Record<InternshipMode, string>> = {
  short: {
    remote: 'Remote',
    onsite: 'Onsite',
    hybrid: 'Hybrid',
  },
  full: {
    remote: 'Work from Home',
    onsite: 'Work from Office',
    hybrid: 'Hybrid',
  },
};

export function modeLabel(mode: InternshipMode, variant: 'short' | 'full' = 'short'): string {
  return `${MODE_ICON[mode]} ${MODE_TEXT[variant][mode]}`;
}
