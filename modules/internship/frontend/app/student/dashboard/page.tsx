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
import { ApplicationStepper } from '@/components/applications/ApplicationStepper';
import { useSavedInternships } from '@/lib/useSavedInternships';
import { useSavedSearches } from '@/lib/useSavedSearches';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { FilterKey } from '@/lib/internshipFilters';
import { APPLICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
import type {
  Internship,
  InternshipApplication,
  PaginatedResult,
  SavedSearch,
  Student,
  StudentDashboardStats,
} from '@/lib/types';

const MODE_LABELS: Record<string, string> = { remote: 'Remote', onsite: 'Onsite', hybrid: 'Hybrid' };
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = { 'full-time': 'Full-time', 'part-time': 'Part-time' };

// Deriving the summary at render time (rather than storing a label
// server-side) keeps it honest against whatever a category/mode is called
// *today* — see SavedSearch's model comment for why.
function summarizeSavedSearch(filters: Record<string, string>): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.category) parts.push(filters.category.split(',').join(', '));
  if (filters.mode) parts.push(filters.mode.split(',').map((m) => MODE_LABELS[m] ?? m).join('/'));
  if (filters.employmentType) {
    parts.push(filters.employmentType.split(',').map((t) => EMPLOYMENT_TYPE_LABELS[t] ?? t).join('/'));
  }
  if (filters.location) parts.push(filters.location);
  if (filters.educationLevel) parts.push(filters.educationLevel.split(',').join('/'));
  if (filters.stream) parts.push(filters.stream.split(',').join('/'));
  if (filters.paid === 'true') parts.push('Paid only');
  if (filters.experienceRequired === 'false') parts.push('Freshers welcome');
  if (filters.stipendMin) parts.push(`₹${Number(filters.stipendMin).toLocaleString('en-IN')}+/mo`);
  return parts.length > 0 ? parts.join(' · ') : 'All internships';
}

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
  const { savedSearches, remove: removeSavedSearch } = useSavedSearches();

  // Both requests below fire together, not one gated on the other's
  // response — the profile-completeness check and the dashboard content
  // are independent data, so serializing them into two round trips (check
  // profile, *then* fetch stats/applications/recommended) only added
  // latency with no benefit. The "complete your profile" branch below still
  // renders as soon as the /students/me call alone resolves; it just no
  // longer blocks the other three calls from starting at the same time.
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    apiFetch<Student>('/students/me', { token })
      .then((student) => {
        setStudentName(student.fullName ?? '');
        setMissingFields(student.profileComplete ? null : student.missingFields ?? []);
      })
      .catch(() => setMissingFields(null));

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
  }, [token]);

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
          <LinkButton href="/internships/browse" withArrow>
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
            <Link href="/applications?filter=all" className="block">
              <Card
                pastel="yellow"
                className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Applications</p>
                <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.total}</p>
                <p className="mt-1 text-xs font-semibold text-sp-ink-3">Total submitted</p>
              </Card>
            </Link>
            <Link href="/applications?filter=in_progress" className="block">
              <Card
                pastel="peach"
                className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">In progress</p>
                <p className="mt-2 text-3xl font-extrabold text-sp-navy">
                  {stats.applications.shortlisted + stats.applications.interviewing}
                </p>
                <p className="mt-1 text-xs font-semibold text-sp-ink-3">Shortlisted or interviewing</p>
              </Card>
            </Link>
            <Link href="/applications?filter=offered" className="block">
              <Card
                pastel="lavender"
                className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Offers</p>
                <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.offered}</p>
                <p className="mt-1 text-xs font-semibold text-sp-ink-3">Offers received</p>
              </Card>
            </Link>
            <Link href="/applications?filter=applied" className="block">
              <Card
                pastel="mint"
                className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Awaiting response</p>
                <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.applied}</p>
                <p className="mt-1 text-xs font-semibold text-sp-ink-3">Applied, not yet reviewed</p>
              </Card>
            </Link>
          </div>

          {recommended.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-sp-navy">Recommended for you</h2>
                  <p className="text-sm text-sp-ink-3">
                    Matched against your skills and saved preferences
                  </p>
                </div>
                <Link href="/internships/browse?sort=relevance" className="text-sm font-bold text-sp-blue">
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

          {savedSearches.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-sp-navy">Saved searches</h2>
                <p className="text-sm text-sp-ink-3">Jump straight back into a search you saved earlier</p>
              </div>
              <div className="flex flex-col gap-3">
                {savedSearches.map((search: SavedSearch) => (
                  <Card key={search.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <p className="text-sm font-semibold text-sp-navy">{summarizeSavedSearch(search.filters)}</p>
                    <div className="flex items-center gap-2">
                      <LinkButton
                        href={buildInternshipsHref({}, search.filters as Partial<Record<FilterKey, string>>)}
                        variant="secondary"
                      >
                        Run search
                      </LinkButton>
                      <button
                        type="button"
                        onClick={() => removeSavedSearch(search.id)}
                        aria-label="Delete saved search"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-danger"
                      >
                        &times;
                      </button>
                    </div>
                  </Card>
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
                <Link href="/internships/browse" className="font-bold text-sp-blue">
                  Browse internships →
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {recent.map((app) => {
                  const isTerminal = app.status === 'rejected' || app.status === 'withdrawn';
                  return (
                    <Card
                      key={app.id}
                      className={`flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${STATUS_TONE_BORDER[APPLICATION_STATUS_TONE[app.status]]}`}
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
                            {isTerminal && <Badge tone={APPLICATION_STATUS_TONE[app.status]}>{app.status}</Badge>}
                          </div>
                          <p className="text-sm text-sp-ink-3">
                            {app.internship?.employer?.organizationName} · Applied{' '}
                            {new Date(app.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      {!isTerminal && (
                        <div className="overflow-x-auto sm:pl-2">
                          <ApplicationStepper status={app.status} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
