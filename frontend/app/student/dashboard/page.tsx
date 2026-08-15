'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { ProfileFieldsCard } from '@/components/student/ProfileFieldsCard';
import { ProfileMediaCard } from '@/components/student/ProfileMediaCard';
import { PreferencesCard } from '@/components/student/PreferencesCard';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { useSavedInternships } from '@/lib/useSavedInternships';
import { APPLICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
import type {
  Internship,
  InternshipApplication,
  PaginatedResult,
  Student,
  StudentDashboardStats,
} from '@/lib/types';

export default function StudentDashboardPage() {
  const { token } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [recent, setRecent] = useState<InternshipApplication[]>([]);
  const [recommended, setRecommended] = useState<Internship[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  // undefined = still checking, null = complete, string[] = what's missing.
  // Shown inline instead of silently redirecting away, so a student who's
  // filled in everything except (say) their resume can see exactly what's
  // left rather than landing on the profile page with no explanation.
  const [missingFields, setMissingFields] = useState<string[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { saved } = useSavedInternships();

  useEffect(() => {
    if (!token) return;
    apiFetch<Student>('/students/me', { token })
      .then((student) => {
        setStudentName(student.fullName ?? '');
        setMissingFields(student.profileComplete ? null : student.missingFields ?? []);
      })
      .catch(() => setMissingFields(null));
  }, [token]);

  useEffect(() => {
    if (missingFields === undefined || missingFields !== null || !token) return;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<StudentDashboardStats>('/students/me/dashboard', { token }),
      apiFetch<PaginatedResult<InternshipApplication>>('/applications/me', { token }),
      // Same relevance ranking the browse page defaults to for a student with
      // skills set — surfacing it here too turns "browse and hope" into an
      // actual recommendation, not just another static list.
      apiFetch<PaginatedResult<Internship>>('/internships?sort=relevance&pageSize=3', { token }),
    ])
      .then(([statsResult, applicationsResult, recommendedResult]) => {
        setStats(statsResult);
        setRecent(applicationsResult.items.slice(0, 5));
        setRecommended(recommendedResult.items);
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Dashboard
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-sp-navy sm:text-3xl">
            {studentName ? `Welcome back, ${studentName.split(' ')[0]}` : 'Your dashboard'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditingProfile((v) => !v)}>
            {editingProfile ? 'Hide profile editor' : 'Edit profile'}
          </Button>
          <LinkButton href="/internships/bookmarked" variant="secondary">
            ★ Bookmarked{saved.length > 0 ? ` (${saved.length})` : ''}
          </LinkButton>
          <LinkButton href="/internships" withArrow>
            Browse internships
          </LinkButton>
        </div>
      </div>

      {editingProfile && (
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold text-sp-navy">Your profile</h2>
            <ProfileFieldsCard token={token} />
          </Card>
          <ProfileMediaCard token={token} />
          <Card className="p-6">
            <h2 className="mb-2 text-lg font-bold text-sp-navy">Preferences</h2>
            <p className="mb-4 text-sm text-sp-ink-2">
              Optional, but helps us surface internships that actually match what you want.
            </p>
            <PreferencesCard token={token} />
          </Card>
        </div>
      )}

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

          {recommended.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-sp-navy">Recommended for you</h2>
                  <p className="text-sm text-sp-ink-3">Matched against the skills on your profile</p>
                </div>
                <Link href="/internships?sort=relevance" className="text-sm font-bold text-sp-blue">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {recommended.map((internship) => (
                  <InternshipCard key={internship.id} internship={internship} />
                ))}
              </div>
            </div>
          )}

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
                  <Card
                    key={app.id}
                    className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[APPLICATION_STATUS_TONE[app.status]]}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sp-md bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
                        {(app.internship?.employer?.organizationName ?? 'O').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <Link
                            href={`/internships/${app.internshipId}`}
                            className="font-bold text-sp-navy hover:underline"
                          >
                            {app.internship?.title ?? 'Internship'}
                          </Link>
                          <Badge tone={APPLICATION_STATUS_TONE[app.status]}>{app.status}</Badge>
                        </div>
                        <p className="text-sm text-sp-ink-3">
                          {app.internship?.employer?.organizationName} · Applied{' '}
                          {new Date(app.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
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
