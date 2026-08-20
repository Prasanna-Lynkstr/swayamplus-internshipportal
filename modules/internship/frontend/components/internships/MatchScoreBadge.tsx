import { Badge } from '@/components/ui/Badge';

// Tiered rather than always the same color — a flat "good" tone on a 20%
// match would read as more encouraging than the number actually is. Mirrors
// the 0-100-or-null convention of computeMatchPercent on the backend: null
// means there's no skill/preference basis to score against (e.g. a student
// with no skills set and no preferences saved), not a 0% match, so this
// renders nothing rather than a misleading "0% match".
export function MatchScoreBadge({ percent }: { percent: number | null | undefined }) {
  if (percent == null) return null;
  const tone = percent >= 70 ? 'good' : percent >= 40 ? 'orange' : 'neutral';
  return <Badge tone={tone}>{percent}% match</Badge>;
}
