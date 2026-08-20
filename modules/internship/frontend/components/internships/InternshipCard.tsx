'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShareSaveActions } from './ShareSaveActions';
import { MatchScoreBadge } from './MatchScoreBadge';
import { EmployerNameTrigger } from '@/components/employers/EmployerNameTrigger';
import { modeLabel } from '@/lib/mode';
import { categoryIcon } from '@/lib/categories';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { daysLeft, postedLabel, stipendLabel } from '@/lib/internshipFormat';
import type { Internship } from '@/lib/types';

export function InternshipCard({ internship }: { internship: Internship }) {
  const orgName = internship.employer?.organizationName ?? 'Organization';
  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
  const employmentTypes = useTaxonomy('employment_type');
  const employmentTypeLabel =
    employmentTypes.find((t) => t.value === internship.employmentType)?.label ??
    internship.employmentType;
  const eligibilityTag = internship.eligibility[0];

  return (
    <Link href={`/internships/${internship.id}`} className="block h-full">
      <Card className="flex h-full flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sp-orange/30 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sp-sm bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <EmployerNameTrigger
              employerId={internship.employerId}
              orgName={orgName}
              className="min-w-0 truncate text-xs font-bold text-sp-ink-3 hover:text-sp-blue hover:underline focus:underline focus:outline-none"
            />
          </div>
          <ShareSaveActions internshipId={internship.id} title={internship.title} />
        </div>

        <h3 className="line-clamp-2 text-base font-extrabold leading-snug tracking-tight text-sp-navy">
          {internship.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-sp-ink-3">
          <span>{modeLabel(internship.mode)}</span>
          <span>&middot;</span>
          <span>{employmentTypeLabel}</span>
          <span>&middot;</span>
          <span>{internship.durationWeeks} weeks</span>
          {internship.location && (
            <>
              <span>&middot;</span>
              <span>{internship.location}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="orange">
            <span className="mr-1">{categoryIcon(internship.category)}</span>
            {internship.category}
          </Badge>
          {eligibilityTag && <Badge tone="neutral">{eligibilityTag}</Badge>}
          <MatchScoreBadge percent={internship.matchPercent} />
        </div>

        {internship.matchedSkills && internship.matchedSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-sp-ink-3">
            <span>Matches your skills:</span>
            {internship.matchedSkills.map((skill) => (
              <Badge key={skill} tone="good">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
          <div className="flex items-center gap-1.5">
            {internship.appliedByCurrentUser && <Badge tone="good">Applied</Badge>}
            <Badge tone={isPaid ? 'good' : 'neutral'}>
              {stipendLabel(internship.stipendMin, internship.stipendMax)}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-bold text-sp-orange-ink">
              {daysLeft(internship.applicationDeadline)}
            </span>
            <span className="text-[11px] font-semibold text-sp-ink-3">
              {postedLabel(internship.createdAt)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
