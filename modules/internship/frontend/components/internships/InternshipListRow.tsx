'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShareSaveActions } from './ShareSaveActions';
import { EmployerNameTrigger } from '@/components/employers/EmployerNameTrigger';
import { modeLabel } from '@/lib/mode';
import { categoryIcon } from '@/lib/categories';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { daysLeft, isNewListing, postedLabel, stipendLabel } from '@/lib/internshipFormat';
import type { Internship } from '@/lib/types';

// The browse page's dense, single-column result row — same data and click
// target as InternshipCard, laid out as one wide row instead of a grid
// cell so a description snippet and skill tags fit without needing the
// detail page. Every other InternshipCard call site (homepage, hub,
// dashboard, bookmarked page) is unaffected — this is scoped to browse.
export function InternshipListRow({ internship }: { internship: Internship }) {
  const orgName = internship.employer?.organizationName ?? 'Organization';
  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
  const employmentTypes = useTaxonomy('employment_type');
  const employmentTypeLabel =
    employmentTypes.find((t) => t.value === internship.employmentType)?.label ??
    internship.employmentType;
  const eligibilityTag = internship.eligibility[0];
  const isNew = isNewListing(internship.createdAt);

  return (
    <Link href={`/internships/${internship.id}`} className="block">
      <Card className="flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sp-orange/30 hover:shadow-md sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sp-sm bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-base font-extrabold leading-snug tracking-tight text-sp-navy">
                  {internship.title}
                </h3>
                <EmployerNameTrigger
                  employerId={internship.employerId}
                  orgName={orgName}
                  className="min-w-0 truncate text-xs font-bold text-sp-ink-3 hover:text-sp-blue hover:underline focus:underline focus:outline-none"
                />
              </div>
            </div>
            <ShareSaveActions internshipId={internship.id} title={internship.title} />
          </div>

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

          <p className="line-clamp-2 text-sm text-sp-ink-2">{internship.description}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {isNew && <Badge tone="good">New</Badge>}
            {internship.activelyHiring && <Badge tone="orange">Actively hiring</Badge>}
            <Badge tone="orange">
              <span className="mr-1">{categoryIcon(internship.category)}</span>
              {internship.category}
            </Badge>
            {eligibilityTag && <Badge tone="neutral">{eligibilityTag}</Badge>}
          </div>

          {internship.skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {internship.skillTags.map((skill) => (
                <Badge key={skill} tone="neutral">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-black/5 pt-3 sm:min-w-[150px] sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
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
