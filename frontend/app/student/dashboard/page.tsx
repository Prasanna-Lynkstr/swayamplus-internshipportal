'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { InternshipApplication, PaginatedResult, Student, StudentDashboardStats } from '@/lib/types';

const STATUS_TONE: Record<string, 'orange' | 'good' | 'danger' | 'neutral'> = {
  applied: 'neutral',
  shortlisted: 'orange',
  interviewing: 'orange',
  offered: 'good',
  rejected: 'danger',
  withdrawn: 'neutral',
};

export default function StudentDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [recent, setRecent] = useState<InternshipApplication[]>([]);
  // undefined = still checking, null = complete, string[] = what's missing.
  // Shown inline instead of silently redirecting away, so a student who's
  // filled in everything except (say) their resume can see exactly what's
  // left rather than landing on the profile page with no explanation.
  const [missingFields, setMissingFields] = useState<string[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetch<Student>('/students/me', { token })
      .then((student) => setMissingFields(student.profileComplete ? null : student.missingFields ?? []))
      .catch(() => setMissingFields(null));
  }, [token]);

  useEffect(() => {
    if (missingFields === undefined || missingFields !== null || !token) return;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<StudentDashboardStats>('/students/me/dashboard', { token }),
      apiFetch<PaginatedResult<InternshipApplication>>('/applications/me', { token }),
    ])
      .then(([statsResult, applicationsResult]) => {
        setStats(statsResult);
        setRecent(applicationsResult.items.slice(0, 5));
      })
      .catch(() => setError('Could not load your dashboard. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, [token, missingFields]);

  if (missingFields === undefined) {
    return <p className="text-sp-ink-3">Loading…</p>;
  }

  if (missingFields && missingFields.length > 0) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6">
          <h1 className="mb-2 text-xl font-extrabold text-sp-navy">Complete your profile</h1>
          <p className="mb-4 text-sm text-sp-ink-2">
            Your dashboard needs a complete profile so employers have what they need to review
            you. You&apos;re missing:
          </p>
          <ul className="mb-5 flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <li key={field}>
                <Badge tone="orange">{field}</Badge>
              </li>
            ))}
          </ul>
          <Link href="/register/student">
            <Button withArrow>Complete your profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-sp-navy">Your dashboard</h1>
        <Link href="/internships">
          <Button withArrow>Browse internships</Button>
        </Link>
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card pastel="yellow" className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Applications</p>
              <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.total}</p>
              <p className="mt-1 text-xs font-semibold text-sp-ink-3">Total submitted</p>
            </Card>
            <Card pastel="peach" className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">In progress</p>
              <p className="mt-2 text-3xl font-extrabold text-sp-navy">
                {stats.applications.shortlisted + stats.applications.interviewing}
              </p>
              <p className="mt-1 text-xs font-semibold text-sp-ink-3">Shortlisted or interviewing</p>
            </Card>
            <Card pastel="lavender" className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Offers</p>
              <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.offered}</p>
              <p className="mt-1 text-xs font-semibold text-sp-ink-3">Offers received</p>
            </Card>
            <Card pastel="mint" className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Awaiting response</p>
              <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.applied}</p>
              <p className="mt-1 text-xs font-semibold text-sp-ink-3">Applied, not yet reviewed</p>
            </Card>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-sp-navy">Recent applications</h2>
              <Link href="/applications" className="text-sm font-bold text-sp-blue">
                View all →
              </Link>
            </div>
            {recent.length === 0 ? (
              <Card className="p-10 text-center text-sp-ink-3">
                You haven&apos;t applied to any internships yet.{' '}
                <Link href="/internships" className="font-bold text-sp-blue">
                  Browse internships →
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {recent.map((app) => (
                  <Card key={app.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <Link
                          href={`/internships/${app.internshipId}`}
                          className="font-bold text-sp-navy hover:underline"
                        >
                          {app.internship?.title ?? 'Internship'}
                        </Link>
                        <Badge tone={STATUS_TONE[app.status]}>{app.status}</Badge>
                      </div>
                      <p className="text-sm text-sp-ink-3">
                        {app.internship?.employer?.organizationName} · Applied{' '}
                        {new Date(app.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
