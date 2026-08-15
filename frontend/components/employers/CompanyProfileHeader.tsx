'use client';

import { useTaxonomy } from '@/lib/useTaxonomy';
import { Badge } from '@/components/ui/Badge';
import { resolveFileUrl } from '@/lib/files';
import type { PublicEmployerProfile } from '@/lib/types';

// LinkedIn-style banded ranges rather than the raw headcount number — reads
// as a company-size fact, not an oddly precise-looking figure an employer
// typed into a form field.
function headcountLabel(headcount: number | null): string | null {
  if (!headcount || headcount < 1) return null;
  if (headcount <= 10) return '1-10 employees';
  if (headcount <= 50) return '11-50 employees';
  if (headcount <= 200) return '51-200 employees';
  if (headcount <= 500) return '201-500 employees';
  if (headcount <= 1000) return '501-1,000 employees';
  return '1,000+ employees';
}

// Shared by the standalone /employers/:id page and the CompanyProfileModal
// so both read as the same professional company page — logo/name/verified
// badge on a brand banner, then a facts grid (industries, internship
// specialties), same information a LinkedIn company page leads with.
// getPublicProfile only ever returns approved employers, so "Verified" here
// is always an accurate claim, not an assumption.
export function CompanyProfileHeader({ employer }: { employer: PublicEmployerProfile }) {
  const categories = useTaxonomy('internship_category');
  const internshipTypeLabels = employer.internshipTypesExpected.map(
    (value) => categories.find((c) => c.value === value)?.label ?? value,
  );
  const size = headcountLabel(employer.headcount);
  const factLine = [employer.industryTags[0], employer.hqCity, size].filter(Boolean).join(' · ');

  return (
    <div className="overflow-hidden rounded-sp-xl border border-black/5 bg-sp-bg-elev shadow-sm shadow-black/5">
      <div className="sp-green-gradient h-24 sm:h-28" />
      <div className="px-6 pb-6">
        <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
          {employer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
            <img
              src={resolveFileUrl(employer.logoUrl)}
              alt={employer.organizationName ?? 'Company logo'}
              className="h-24 w-24 shrink-0 rounded-sp-lg border-4 border-sp-bg-elev bg-white object-cover shadow-md sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sp-lg border-4 border-sp-bg-elev bg-sp-bg-sunken text-3xl font-black text-sp-ink-2 shadow-md sm:h-28 sm:w-28">
              {(employer.organizationName ?? 'O').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pb-1">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-sp-navy">
                  {employer.organizationName ?? 'Organization'}
                </h1>
                <Badge tone="good">✓ Verified employer</Badge>
              </div>
              {factLine && <p className="mt-1 text-sm font-semibold text-sp-ink-2">{factLine}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {employer.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border-2 border-sp-navy/15 px-4 py-2 text-sm font-bold text-sp-navy hover:border-sp-navy/30"
                >
                  Website ↗
                </a>
              )}
              {employer.linkedinBusinessPage && (
                <a
                  href={employer.linkedinBusinessPage}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border-2 border-sp-navy/15 px-4 py-2 text-sm font-bold text-sp-navy hover:border-sp-navy/30"
                >
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {(employer.industryTags.length > 0 || internshipTypeLabels.length > 0) && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-black/5 pt-5 sm:grid-cols-2">
            {employer.industryTags.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                  Industries
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {employer.industryTags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {internshipTypeLabels.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                  Internship types offered
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {internshipTypeLabels.map((label) => (
                    <Badge key={label} tone="orange">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
