import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Internship } from '@/lib/types';

function formatStipend(min: number | null, max: number | null) {
  if (!min && !max) return 'Stipend not disclosed';
  if (min && max && min !== max) return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}/mo`;
  return `₹${(min ?? max)?.toLocaleString('en-IN')}/mo`;
}

export function InternshipCard({ internship }: { internship: Internship }) {
  return (
    <Link href={`/internships/${internship.id}`}>
      <Card className="flex h-full flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <Badge tone="orange">{internship.domain}</Badge>
          <Badge tone="neutral">{internship.mode}</Badge>
        </div>
        <h3 className="text-lg font-bold text-sp-navy">{internship.title}</h3>
        <p className="text-sm font-semibold text-sp-ink-2">
          {internship.employer?.organizationName ?? 'Organization'}
        </p>
        <p className="line-clamp-2 text-sm text-sp-ink-3">{internship.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs font-semibold text-sp-ink-2">
          <span>{internship.durationWeeks} weeks</span>
          <span>{formatStipend(internship.stipendMin, internship.stipendMax)}</span>
          {internship.location && <span>{internship.location}</span>}
        </div>
      </Card>
    </Link>
  );
}
