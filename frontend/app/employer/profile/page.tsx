'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { EMPLOYER_VERIFICATION_STATUS_TONE } from '@/lib/status-labels';
import { EmployerProfileForm } from '@/components/employer/EmployerProfileForm';
import { EmployerLogoCard } from '@/components/employer/EmployerLogoCard';
import type { Employer, EmployerDashboardStats } from '@/lib/types';

const VERIFICATION_LABEL: Record<Employer['verificationStatus'], string> = {
  pending: 'Verification pending',
  approved: 'Verified',
  rejected: 'Verification rejected',
};

export default function EmployerProfilePage() {
  const { token } = useAuth();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [stats, setStats] = useState<EmployerDashboardStats | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token }).then(setEmployer);
    apiFetch<EmployerDashboardStats>('/employers/me/dashboard', { token }).then(setStats);
  }, [token]);

  const orgName = employer?.organizationName ?? 'Your organization';
  const initial = orgName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card pastel="lavender" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 p-6 sm:p-8">
          {employer?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
            <img
              src={resolveFileUrl(employer.logoUrl)}
              alt={orgName}
              className="h-20 w-20 shrink-0 rounded-sp-lg border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sp-lg border-2 border-white bg-white text-3xl font-black text-sp-ink-2 shadow-sm">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-sp-navy sm:text-3xl">{orgName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {employer && (
                <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]}>
                  {VERIFICATION_LABEL[employer.verificationStatus]}
                </Badge>
              )}
              {employer?.hqCity && <span className="text-sm font-semibold text-sp-ink-2">{employer.hqCity}</span>}
              {employer?.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-sp-blue hover:underline"
                >
                  Visit website ↗
                </a>
              )}
            </div>
            {employer && employer.industryTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {employer.industryTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <LinkButton href="/employer/dashboard" variant="secondary">
            Back to dashboard
          </LinkButton>
        </div>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card pastel="yellow" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Postings</p>
            <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.internships.total}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">{stats.internships.published} published</p>
          </Card>
          <Card pastel="peach" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Applications received</p>
            <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.total}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">
              {stats.applications.pendingReview} awaiting review
            </p>
          </Card>
          <Card pastel="mint" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">EOI submitted</p>
            <p className="mt-2 text-2xl font-extrabold text-sp-navy">
              {employer?.acceptedTermsAt
                ? new Date(employer.acceptedTermsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">Terms &amp; conditions accepted</p>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <EmployerLogoCard token={token} />
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-sp-navy">Organization details</h2>
          <EmployerProfileForm token={token} mode="edit" />
        </Card>
      </div>
    </div>
  );
}
