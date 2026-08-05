import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShareSaveActions } from './ShareSaveActions';
import { modeLabel } from '@/lib/mode';
import type { Internship } from '@/lib/types';

function formatCompact(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function stipendLabel(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unpaid';
  if (min && max && min !== max) return `₹${formatCompact(min)}-${formatCompact(max)}/mo`;
  return `₹${formatCompact((min ?? max) as number)}/mo`;
}

function daysLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Closing today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function InternshipCard({ internship }: { internship: Internship }) {
  const orgName = internship.employer?.organizationName ?? 'Organization';
  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);

  const tagChips = [internship.category, ...internship.eligibility];
  const visibleTags = tagChips.slice(0, 3);
  const extraTagCount = tagChips.length - visibleTags.length;

  return (
    <Link href={`/internships/${internship.id}`}>
      <Card className="flex flex-col gap-4 p-5 transition-colors hover:border-sp-orange/30 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sp-md bg-sp-bg-sunken text-lg font-black text-sp-ink-2">
          {orgName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-sp-navy">{internship.title}</h3>
              <p className="text-sm font-semibold text-sp-ink-2">{orgName}</p>
            </div>
            <Badge tone={isPaid ? 'good' : 'neutral'}>
              {stipendLabel(internship.stipendMin, internship.stipendMax)}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sp-ink-3">
            <span>{internship.employmentType === 'part-time' ? 'Part-time' : 'Full-time'}</span>
            <span>· {modeLabel(internship.mode)}</span>
            {internship.location && <span>· {internship.location}</span>}
            <span>· {internship.durationWeeks} weeks</span>
          </div>

          {internship.skillTags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {internship.skillTags.slice(0, 4).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {visibleTags.map((tag) => (
              <Badge key={tag} tone="orange">
                {tag}
              </Badge>
            ))}
            {extraTagCount > 0 && <Badge tone="orange">+{extraTagCount} more</Badge>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sp-ink-3">
              <span>
                Posted{' '}
                {new Date(internship.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="font-semibold text-sp-orange">
                {daysLeft(internship.applicationDeadline)}
              </span>
            </div>
            <ShareSaveActions internshipId={internship.id} title={internship.title} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
