'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApplicationStepper } from '@/components/applications/ApplicationStepper';
import { APPLICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
import type { InternshipApplication, PaginatedResult } from '@/lib/types';

// Split into 'applied' + 'in_progress' (rather than one combined 'active')
// specifically so this matches the student dashboard's own four stat cards
// exactly — each dashboard count links here with a `filter` query param, and
// a mismatched grouping would show a different number than what was clicked.
const IN_PROGRESS_STATUSES = ['shortlisted', 'interviewing'] as const;

type FilterKey = 'all' | 'applied' | 'in_progress' | 'offered' | 'rejected' | 'withdrawn';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Awaiting response' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'offered', label: 'Offered' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

function isFilterKey(value: string | null): value is FilterKey {
  return FILTERS.some((f) => f.key === value);
}

// useSearchParams() requires a Suspense boundary above it (Next.js bails
// prerendering otherwise) — this outer component is just that wrapper; all
// the real page logic stays in MyApplicationsPageContent below.
export default function MyApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-sp-ink-3">Loading…</p>}>
      <MyApplicationsPageContent />
    </Suspense>
  );
}

function MyApplicationsPageContent() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter');
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  // Read once from the URL a caller (the dashboard's stat cards) may have
  // set — not kept in sync on every chip click, since this only needs to
  // land the visitor on the right subset, not maintain shareable filter URLs.
  const [filter, setFilter] = useState<FilterKey>(isFilterKey(initialFilter) ? initialFilter : 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    apiFetch<PaginatedResult<InternshipApplication>>('/applications/me', { token })
      .then((result) => setApplications(result.items))
      .catch(() => setError('Could not load your applications. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'student') load();
    else setLoading(false);
  }, [user, token]);

  const withdraw = async (id: number) => {
    try {
      await apiFetch(`/applications/${id}/withdraw`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not withdraw this application. Please try again.');
    }
  };

  const stats = useMemo(() => {
    const total = applications.length;
    // "In progress" here matches the dashboard's own definition (shortlisted
    // or interviewing) — not every non-terminal status — so this number
    // always agrees with what the in_progress filter/chip actually shows.
    const inProgress = applications.filter((a) =>
      IN_PROGRESS_STATUSES.includes(a.status as (typeof IN_PROGRESS_STATUSES)[number]),
    ).length;
    const offered = applications.filter((a) => a.status === 'offered').length;
    const decided = applications.filter((a) => a.status === 'offered' || a.status === 'rejected').length;
    const responseRate = total > 0 ? Math.round((decided / total) * 100) : 0;
    return { total, inProgress, offered, responseRate };
  }, [applications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    if (filter === 'in_progress') {
      return applications.filter((a) =>
        IN_PROGRESS_STATUSES.includes(a.status as (typeof IN_PROGRESS_STATUSES)[number]),
      );
    }
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  if (!user || user.role !== 'student') {
    return (
      <p className="text-center text-sp-ink-2">
        <Link href="/register/student" className="font-bold text-sp-blue">
          Log in as a student
        </Link>{' '}
        to see your applications.
      </p>
    );
  }

  if (loading) return <p className="text-sp-ink-3">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Applications
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
          Your applications
        </h1>
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {applications.length === 0 ? (
        !error && (
          <Card className="p-10 text-center text-sp-ink-3">
            You haven&apos;t applied to any internships yet.{' '}
            <Link href="/internships/browse" className="font-bold text-sp-blue">
              Browse internships →
            </Link>
          </Card>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card pastel="yellow" className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-2">Total</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-sp-navy">
                {stats.total}
              </p>
            </Card>
            <Card pastel="peach" className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-2">In progress</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-sp-navy">
                {stats.inProgress}
              </p>
            </Card>
            <Card pastel="mint" className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-2">Offers</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-sp-navy">
                {stats.offered}
              </p>
            </Card>
            <Card pastel="lavender" className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-2">Response rate</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-sp-navy">
                {stats.responseRate}%
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                  filter === f.key
                    ? 'border-sp-navy bg-sp-navy text-white'
                    : 'border-black/10 bg-sp-bg-elev text-sp-ink-2 hover:border-sp-orange/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sp-ink-3">No applications match this filter.</Card>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((app) => {
                const orgName = app.internship?.employer?.organizationName ?? 'Organization';
                const isTerminal = app.status === 'rejected' || app.status === 'withdrawn';
                return (
                  <Card
                    key={app.id}
                    className={`flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${STATUS_TONE_BORDER[APPLICATION_STATUS_TONE[app.status]]}`}
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sp-sm bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
                        {orgName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/internships/${app.internshipId}`}
                          className="font-bold text-sp-navy hover:underline"
                        >
                          {app.internship?.title ?? 'Internship'}
                        </Link>
                        <p className="mt-0.5 text-sm text-sp-ink-3">
                          {orgName} · Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}
                        </p>
                        {isTerminal && (
                          <div className="mt-2">
                            <Badge tone={APPLICATION_STATUS_TONE[app.status]}>{app.status}</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {!isTerminal && (
                        <div className="overflow-x-auto">
                          <ApplicationStepper status={app.status} />
                        </div>
                      )}
                      {!['withdrawn', 'rejected', 'offered'].includes(app.status) && (
                        <Button variant="secondary" onClick={() => withdraw(app.id)} className="shrink-0">
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
