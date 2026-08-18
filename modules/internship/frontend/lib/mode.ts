// Single source for the mode → icon association. The label text intentionally
// differs by context (a compact list row vs. the detail page's fuller
// "Work from Home" copy), so callers pick a variant rather than this module
// forcing one wording on both. `mode` is an admin-managed taxonomy value
// (see lib/useTaxonomy.ts) — unrecognized values (an admin-added mode this
// map hasn't been taught about) fall back to a generic pin + the raw value
// rather than rendering "undefined".
const MODE_ICON: Record<string, string> = {
  remote: '🏠',
  onsite: '🏢',
  hybrid: '🔀',
};

const MODE_TEXT: Record<'short' | 'full', Record<string, string>> = {
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

export function modeLabel(mode: string, variant: 'short' | 'full' = 'short'): string {
  const icon = MODE_ICON[mode] ?? '📍';
  const text = MODE_TEXT[variant][mode] ?? mode;
  return `${icon} ${text}`;
}
