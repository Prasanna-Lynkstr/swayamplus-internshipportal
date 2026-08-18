// Shared display formatting for an internship, used by both the grid card
// (InternshipCard) and the browse page's dense list row (InternshipListRow)
// — extracted so the two never drift on how a stipend, deadline, or posted
// date reads.

export function formatCompact(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function stipendLabel(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unpaid';
  if (min && max && min !== max) return `₹${formatCompact(min)}-${formatCompact(max)}/mo`;
  return `₹${formatCompact((min ?? max) as number)}/mo`;
}

export function daysLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Closing today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function postedLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  return `Posted ${days} days ago`;
}

// A real signal, not a decorative one — anything posted in the last 3 days,
// computed straight from createdAt (already on every serialized internship,
// no extra backend field needed).
const NEW_LISTING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function isNewListing(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_LISTING_WINDOW_MS;
}
