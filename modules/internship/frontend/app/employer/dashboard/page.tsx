'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import { ApplicantProfileModal } from '@/components/employer/ApplicantProfileModal';
import { RecommendedCandidatesPanel } from '@/components/employer/RecommendedCandidatesPanel';
import { CopyButton, IconMail, IconPhone } from '@/components/ui/ContactLinks';
import {
  APPLICATION_STATUS_TONE,
  INTERNSHIP_STATUS_TONE,
  STATUS_TONE_BORDER,
  internshipStatusLabel,
} from '@/lib/status-labels';
import type {
  Employer,
  EmployerDashboardStats,
  Internship,
  InternshipApplication,
  ApplicationStatus,
  PaginatedResult,
} from '@/lib/types';

const APPLICATION_STATUS_FILTERS: Array<{ value: ApplicationStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

type ApplicantsSort = 'newest' | 'recommended' | 'oldest';

// A compact, at-a-glance stand-in for the full checklist breakdown (which
// stays in ApplicantProfilePanel) — at 200+ applicants, showing every
// checklist line inline would make each row too tall to scan.
function MatchBadge({ matchScore, recommended }: { matchScore?: number | null; recommended?: boolean }) {
  if (matchScore == null) return null;
  return <Badge tone={recommended ? 'good' : 'neutral'}>{recommended ? `Recommended · ${matchScore}%` : `${matchScore}% match`}</Badge>;
}

// A clickable Badge — same tone palette, but a button that pre-filters the
// applicants panel to that status instead of just describing a count.
const COUNT_PILL_TONE = {
  orange: 'bg-sp-orange-soft text-sp-orange-ink hover:bg-sp-orange-soft/70',
  neutral: 'bg-white text-sp-ink-2 hover:bg-black/5',
  good: 'bg-sp-good-soft text-sp-good hover:bg-sp-good-soft/70',
} as const;

function CountPill({
  tone,
  onClick,
  children,
}: {
  tone: keyof typeof COUNT_PILL_TONE;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors ${COUNT_PILL_TONE[tone]}`}
    >
      {children}
    </button>
  );
}

function ApplicantsPanel({
  internshipId,
  token,
  initialStatus,
}: {
  internshipId: string;
  token: string | null;
  /** Lets the dashboard's "N to review" CTA land here pre-filtered to 'applied'. */
  initialStatus?: ApplicationStatus;
}) {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [profileOpenFor, setProfileOpenFor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Separate from actionError for the same reason as EmployerDashboardPage below:
  // a status-update failure shouldn't hide applicants that already loaded fine.
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingReject, setPendingReject] = useState<InternshipApplication | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>(initialStatus ?? '');
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [sort, setSort] = useState<ApplicantsSort>('newest');
  const [nameInput, setNameInput] = useState('');
  const [name, setName] = useState('');

  // Debounce the name search so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = setTimeout(() => setName(nameInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [nameInput]);

  // Any filter change invalidates the current page.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, recommendedOnly, sort, name]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set('status', statusFilter);
    if (recommendedOnly) params.set('recommended', 'true');
    if (sort !== 'newest') params.set('sort', sort);
    if (name) params.set('q', name);
    apiFetch<PaginatedResult<InternshipApplication>>(
      `/internships/${internshipId}/applications?${params.toString()}`,
      { token },
    )
      .then((result) => {
        setApplications(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => setLoadError('Could not load applicants. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [internshipId, token, page, statusFilter, recommendedOnly, sort, name]);

  const filtersActive = Boolean(statusFilter || recommendedOnly || name);
  const clearFilters = () => {
    setStatusFilter('');
    setRecommendedOnly(false);
    setNameInput('');
  };

  const updateStatus = async (applicationId: number, status: ApplicationStatus) => {
    setActionError('');
    try {
      await apiFetch(`/applications/${applicationId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      load();
    } catch {
      setActionError('Could not update this application. Please try again.');
    }
  };

  // Rejecting a candidate is more consequential than the other status
  // transitions (shortlist/interview/offer), so it's the one that gets a
  // confirmation step — same reasoning as close/delete on the dashboard below.
  const chooseStatus = (app: InternshipApplication, status: ApplicationStatus) => {
    if (status === 'rejected') {
      setPendingReject(app);
      return;
    }
    updateStatus(app.id, status);
  };

  // The profile modal only knows an application id, not the full row (it
  // fetches its own richer profile) — look the row up from what's already
  // loaded here so the reject confirmation can still name the applicant.
  // Closing the modal first (whether or not this ends up opening the
  // confirm toast) matches the "one overlay at a time" rule used by every
  // other decision modal in this codebase.
  const requestStatusChangeFromModal = (applicationId: number, status: ApplicationStatus) => {
    setProfileOpenFor(null);
    const app = applications.find((a) => a.id === applicationId);
    if (status === 'rejected') {
      setPendingReject(app ?? ({ id: applicationId } as InternshipApplication));
      return;
    }
    updateStatus(applicationId, status);
  };

  const confirmReject = async () => {
    if (!pendingReject) return;
    setRejectBusy(true);
    try {
      await updateStatus(pendingReject.id, 'rejected');
    } finally {
      setRejectBusy(false);
      setPendingReject(null);
    }
  };

  if (loadError) return <p className="p-4 text-sm font-semibold text-sp-danger">{loadError}</p>;

  return (
    <div className="flex flex-col divide-y divide-black/5">
      <div className="flex flex-wrap items-end gap-2 pb-3">
        <div className="min-w-[10rem] flex-1">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Search by name…"
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
          >
            {APPLICATION_STATUS_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as ApplicantsSort)}
          >
            <option value="newest">Newest first</option>
            <option value="recommended">Best match first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
        <label className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-sm font-semibold text-sp-navy">
          <input
            type="checkbox"
            checked={recommendedOnly}
            onChange={(e) => setRecommendedOnly(e.target.checked)}
          />
          Recommended only
        </label>
        {filtersActive && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <p className="pb-2 text-xs font-semibold text-sp-ink-3">
        {loading ? 'Loading…' : `${total} applicant${total === 1 ? '' : 's'}`}
      </p>
      {actionError && (
        <p className="pb-2 text-sm font-semibold text-sp-danger">{actionError}</p>
      )}
      {!loading && applications.length === 0 && (
        <p className="py-4 text-sm text-sp-ink-3">
          {filtersActive ? 'No applicants match your filters.' : 'No applicants yet.'}
        </p>
      )}
      {applications.map((app) => (
        <div key={app.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
          <div className="flex min-w-0 gap-3">
            {app.student?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
              <img
                src={resolveFileUrl(app.student.photoUrl)}
                alt={app.student.fullName ?? 'Applicant'}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
                {(app.student?.fullName ?? 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-sp-navy">{app.student?.fullName ?? 'Unnamed student'}</p>
                <MatchBadge matchScore={app.matchScore} recommended={app.recommended} />
              </div>
              {/* Bare-minimum, decision-relevant snapshot — background fit
                  (course/year/college/city) and top skills — without opening
                  the full profile modal. Phone/email sit right below since
                  they're what an employer actually needs before calling a
                  candidate; everything else (links, preferences, checklist)
                  lives in the full profile instead. */}
              <p className="text-xs text-sp-ink-3">
                {[
                  app.student?.course,
                  app.student?.graduationYear ? `Class of ${app.student.graduationYear}` : null,
                  app.student?.collegeName,
                  app.student?.city,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No profile details on file'}{' '}
                · Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {app.student?.phone && (
                  <span className="flex items-center gap-1">
                    <a
                      href={`tel:${app.student.phone}`}
                      className="flex items-center gap-1.5 font-semibold text-sp-navy hover:text-sp-blue"
                    >
                      <IconPhone /> {app.student.phone}
                    </a>
                    <CopyButton value={app.student.phone} label="phone number" />
                  </span>
                )}
                {app.student?.user?.identifier && (
                  <span className="flex items-center gap-1">
                    <a
                      href={`mailto:${app.student.user.identifier}`}
                      className="flex items-center gap-1.5 font-semibold text-sp-navy hover:text-sp-blue"
                    >
                      <IconMail /> {app.student.user.identifier}
                    </a>
                    <CopyButton value={app.student.user.identifier} label="email" />
                  </span>
                )}
                {app.student?.resumeUrl && (
                  <a
                    href={resolveFileUrl(app.student.resumeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sp-blue hover:underline"
                  >
                    View resume
                  </a>
                )}
              </div>
              {app.student?.skills && app.student.skills.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {app.student.skills.slice(0, 5).map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                  {app.student.skills.length > 5 && (
                    <span className="text-xs font-semibold text-sp-ink-3">
                      +{app.student.skills.length - 5} more
                    </span>
                  )}
                </div>
              )}
              {app.coverNote && <p className="mt-1.5 text-sm text-sp-ink-2">&ldquo;{app.coverNote}&rdquo;</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge tone={APPLICATION_STATUS_TONE[app.status]}>{app.status}</Badge>
            <div className="flex items-center gap-2">
              {app.status !== 'withdrawn' && (
                <Select
                  value=""
                  onChange={(e) => e.target.value && chooseStatus(app, e.target.value as ApplicationStatus)}
                  className="text-xs"
                >
                  <option value="">Quick update…</option>
                  <option value="shortlisted">Shortlist</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offer</option>
                  <option value="rejected">Reject</option>
                </Select>
              )}
              <Button onClick={() => setProfileOpenFor(app.id)}>Review &amp; notes</Button>
            </div>
          </div>
        </div>
      ))}

      <ApplicantProfileModal
        applicationId={profileOpenFor}
        token={token}
        onClose={() => setProfileOpenFor(null)}
        onRequestStatusChange={requestStatusChangeFromModal}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-sm text-sp-ink-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}

      {pendingReject && (
        <ConfirmToast
          message={`Reject ${pendingReject.student?.fullName ?? 'this applicant'}?`}
          confirmLabel="Reject"
          danger
          busy={rejectBusy}
          onConfirm={confirmReject}
          onCancel={() => setPendingReject(null)}
        />
      )}
    </div>
  );
}

export default function EmployerDashboardPage() {
  const { token } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [stats, setStats] = useState<EmployerDashboardStats | null>(null);
  // undefined = still checking, null = complete, string[] = what's missing.
  // Shown inline instead of silently redirecting away, so an employer who's
  // filled in everything except (say) the verification document can see
  // exactly what's left rather than landing on the profile page with no
  // explanation.
  const [missingFields, setMissingFields] = useState<string[] | null | undefined>(undefined);
  const [moderationMode, setModerationMode] = useState<Employer['moderationMode']>('auto_publish');
  const [orgName, setOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedInitialStatus, setExpandedInitialStatus] = useState<ApplicationStatus | undefined>();
  // Independent of `expanded` (the Applicants panel) — an employer may want
  // to see recommended candidates for a listing with zero applicants yet,
  // or alongside reviewing existing ones, so both can be open at once.
  const [recommendedOpenFor, setRecommendedOpenFor] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'close' | 'delete';
    internship: Internship;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Search + status filter over the postings list itself — without this, an
  // employer with 50+ internships has no way to find one besides scrolling
  // an unpaginated page-1-only list.
  const [titleInput, setTitleInput] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Internship['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // A quick client-side lens over the current page's already-loaded
  // listings — not a server-side filter, so it's scoped to what's on
  // screen. Fine at this platform's real scale (a handful of listings per
  // employer); revisit with a real backend filter if that ever changes.
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTitleQuery(titleInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [titleInput]);

  useEffect(() => {
    setPage(1);
  }, [titleQuery, statusFilter]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token })
      .then((employer) => {
        setMissingFields(employer.profileComplete ? null : employer.missingFields ?? []);
        setModerationMode(employer.moderationMode);
        setOrgName(employer.organizationName ?? '');
        setLogoUrl(employer.logoUrl);
      })
      .catch(() => setMissingFields(null));
  }, [token]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (titleQuery) params.set('q', titleQuery);
    if (statusFilter) params.set('status', statusFilter);
    Promise.all([
      apiFetch<PaginatedResult<Internship>>(`/internships/mine?${params.toString()}`, { token }),
      apiFetch<EmployerDashboardStats>('/employers/me/dashboard', { token }),
    ])
      .then(([internshipsResult, statsResult]) => {
        setInternships(internshipsResult.items);
        setTotalPages(internshipsResult.totalPages);
        setTotal(internshipsResult.total);
        setStats(statsResult);
      })
      .catch(() => setError('Could not load your internships. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (missingFields === null) load();
  }, [token, missingFields, page, titleQuery, statusFilter]);

  const filtersActive = Boolean(titleQuery || statusFilter || needsReviewOnly);
  const clearInternshipFilters = () => {
    setTitleInput('');
    setStatusFilter('');
    setNeedsReviewOnly(false);
  };
  const visibleInternships = needsReviewOnly
    ? internships.filter((i) => (i.pendingReviewCount ?? 0) > 0)
    : internships;
  const toggleNeedsReviewOnly = () => {
    setNeedsReviewOnly((v) => !v);
    setPage(1);
  };

  const toggleRecommended = (internshipId: string) => {
    setRecommendedOpenFor((current) => (current === internshipId ? null : internshipId));
  };

  const openApplicants = (internshipId: string, initialStatus?: ApplicationStatus) => {
    if (expanded === internshipId && expandedInitialStatus === initialStatus) {
      setExpanded(null);
      return;
    }
    setExpanded(internshipId);
    setExpandedInitialStatus(initialStatus);
  };

  // publish() also reopens a closed listing — the backend sets status to
  // 'published' unconditionally, regardless of what it was before.
  const publish = async (id: string) => {
    try {
      await apiFetch(`/internships/${id}/publish`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not publish this internship. Please try again.');
    }
  };

  const withdrawFromReview = async (id: string) => {
    try {
      await apiFetch(`/internships/${id}/withdraw-review`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not withdraw this internship from review. Please try again.');
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    try {
      if (pendingAction.type === 'delete') {
        await apiFetch(`/internships/${pendingAction.internship.id}`, { method: 'DELETE', token });
      } else {
        await apiFetch(`/internships/${pendingAction.internship.id}/close`, { method: 'PATCH', token });
      }
      setPendingAction(null);
      load();
    } catch {
      setError(
        pendingAction.type === 'delete'
          ? 'Could not delete this internship. Please try again.'
          : 'Could not close this internship. Please try again.',
      );
      setPendingAction(null);
    } finally {
      setActionBusy(false);
    }
  };

  if (missingFields === undefined) {
    return <p className="text-sp-ink-3">Loading…</p>;
  }

  if (missingFields && missingFields.length > 0) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6">
          <h1 className="mb-2 text-xl font-extrabold text-sp-navy">Complete your profile</h1>
          <p className="mb-4 text-sm text-sp-ink-2">
            Your dashboard needs a complete organization profile so admin can verify you and
            students know who they&apos;re applying to. You&apos;re missing:
          </p>
          <ul className="mb-5 flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <li key={field}>
                <Badge tone="orange">{field}</Badge>
              </li>
            ))}
          </ul>
          <Link href="/employer/profile">
            <Button withArrow>Complete your profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
            <img
              src={resolveFileUrl(logoUrl)}
              alt={orgName || 'Company logo'}
              className="h-10 w-10 rounded-sp-md object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-sp-md bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
              {(orgName || 'O').charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-sp-navy">Your internships</h1>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/employer/candidates" variant="secondary">
            Find candidates
          </LinkButton>
          <LinkButton href="/employer/profile" variant="secondary">
            Company profile
          </LinkButton>
          <Link href="/employer/post">
            <Button withArrow>Post an internship</Button>
          </Link>
        </div>
      </div>

      {moderationMode === 'review' && (
        <div className="rounded-sp-xl border border-sp-orange/30 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-sp-navy">
            Your postings require admin review before going live — publishing a listing
            sends it to review instead of straight to the public listings.
          </p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card pastel="yellow" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Internships posted</p>
            <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.internships.total}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">{stats.internships.published} published</p>
          </Card>
          <Card pastel="peach" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Applications received</p>
            <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.total}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">Across all your listings</p>
          </Card>
          <button
            type="button"
            onClick={toggleNeedsReviewOnly}
            className="w-full text-left"
            title="Show only listings with applicants awaiting review"
          >
            <Card
              pastel="lavender"
              className={`p-6 transition-shadow ${
                needsReviewOnly ? 'ring-2 ring-sp-orange ring-offset-2' : 'hover:shadow-md'
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Awaiting review</p>
              <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.pendingReview}</p>
              <p className="mt-1 text-xs font-semibold text-sp-ink-3">
                {needsReviewOnly ? 'Showing only these listings — click to clear' : 'Click to jump to these listings'}
              </p>
              <div className="mt-3 flex gap-4 border-t border-black/10 pt-3 text-xs font-bold text-sp-ink-2">
                <span>{stats.applications.shortlisted} shortlisted</span>
                <span>{stats.applications.offered} offered</span>
              </div>
            </Card>
          </button>
          <Card pastel="mint" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Verification status</p>
            <p className="mt-2 text-3xl font-extrabold capitalize text-sp-navy">{stats.verificationStatus}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">Your organization&apos;s status</p>
          </Card>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Search your internships by title…"
          />
        </div>
        <div className="w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Internship['status'] | '')}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending review</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        {filtersActive && (
          <Button variant="ghost" onClick={clearInternshipFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : visibleInternships.length === 0 ? (
        !error && (
          <Card className="p-10 text-center text-sp-ink-3">
            {filtersActive
              ? 'No internships match your filters.'
              : "You haven't posted any internships yet."}
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {visibleInternships.map((internship) => (
            <Card
              key={internship.id}
              className={`p-6 ${STATUS_TONE_BORDER[INTERNSHIP_STATUS_TONE[internship.status]]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-lg font-bold text-sp-navy">{internship.title}</h3>
                    <Badge tone={INTERNSHIP_STATUS_TONE[internship.status]}>
                      {internshipStatusLabel(internship.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-sp-ink-3">
                    {internship.category} · {internship.mode} · {internship.durationWeeks} weeks
                  </p>
                  {internship.status === 'pending_review' && (
                    <p className="mt-1 text-xs font-semibold text-sp-orange">
                      Awaiting admin review — you&apos;ll be notified once it&apos;s decided.
                    </p>
                  )}
                </div>
                {/* Listing lifecycle — compact/secondary on purpose, so this
                    cluster doesn't compete visually with the applicant-review
                    CTA below, which is the action that actually matters day
                    to day once a listing is live. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {internship.status === 'draft' && (
                    <Button variant="secondary" onClick={() => publish(internship.id)}>
                      {moderationMode === 'review' ? 'Submit for review' : 'Publish'}
                    </Button>
                  )}
                  {internship.status === 'pending_review' && (
                    <Button variant="secondary" onClick={() => withdrawFromReview(internship.id)}>
                      Withdraw
                    </Button>
                  )}
                  {internship.status === 'published' && (
                    <Button
                      variant="secondary"
                      className="border-sp-danger/40 text-sp-danger hover:border-sp-danger/70 hover:bg-sp-danger-soft"
                      onClick={() => setPendingAction({ type: 'close', internship })}
                    >
                      Close listing
                    </Button>
                  )}
                  {internship.status === 'closed' && (
                    <Button variant="secondary" onClick={() => publish(internship.id)}>
                      {moderationMode === 'review' ? 'Resubmit for review' : 'Reopen'}
                    </Button>
                  )}
                  <LinkButton href={`/employer/post/${internship.id}`} variant="ghost">
                    Edit
                  </LinkButton>
                  {internship.applicationsCount === 0 && (
                    <Button
                      variant="ghost"
                      className="text-sp-danger hover:bg-sp-danger-soft"
                      onClick={() => setPendingAction({ type: 'delete', internship })}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* The one thing an employer actually needs to act on day to
                  day: a single unmissable "Review applicants" CTA, with the
                  pending/shortlisted/offered breakdown as small clickable
                  pills instead of four competing full-size buttons. */}
              {(internship.applicationsCount ?? 0) > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sp-lg bg-sp-bg-sunken p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-sp-navy">
                      {internship.applicationsCount} applicant{internship.applicationsCount === 1 ? '' : 's'}
                    </span>
                    {(internship.pendingReviewCount ?? 0) > 0 && (
                      <CountPill tone="orange" onClick={() => openApplicants(internship.id, 'applied')}>
                        {internship.pendingReviewCount} awaiting review
                      </CountPill>
                    )}
                    {(internship.shortlistedCount ?? 0) > 0 && (
                      <CountPill tone="neutral" onClick={() => openApplicants(internship.id, 'shortlisted')}>
                        {internship.shortlistedCount} shortlisted
                      </CountPill>
                    )}
                    {(internship.offeredCount ?? 0) > 0 && (
                      <CountPill tone="good" onClick={() => openApplicants(internship.id, 'offered')}>
                        {internship.offeredCount} offered
                      </CountPill>
                    )}
                  </div>
                  <Button onClick={() => openApplicants(internship.id)} withArrow>
                    {expanded === internship.id && expandedInitialStatus === undefined
                      ? 'Hide applicants'
                      : 'Review applicants'}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-sp-ink-3">No applicants yet.</p>
              )}

              {internship.status === 'published' && (
                <div className="mt-3">
                  <Button variant="ghost" onClick={() => toggleRecommended(internship.id)}>
                    {recommendedOpenFor === internship.id ? 'Hide recommended candidates' : 'See recommended candidates'}
                  </Button>
                </div>
              )}

              {expanded === internship.id && (
                <div className="mt-4 border-t border-black/5 pt-2">
                  <ApplicantsPanel
                    key={expandedInitialStatus ?? 'all'}
                    internshipId={internship.id}
                    token={token}
                    initialStatus={expandedInitialStatus}
                  />
                </div>
              )}

              {recommendedOpenFor === internship.id && (
                <div className="mt-4 border-t border-black/5 pt-2">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                    Recommended candidates
                  </p>
                  <RecommendedCandidatesPanel internshipId={internship.id} token={token} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-sm text-sp-ink-2">
            Page {page} of {totalPages} · {total} internship{total === 1 ? '' : 's'}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}

      {pendingAction && (
        <ConfirmToast
          message={
            pendingAction.type === 'delete'
              ? `Permanently delete "${pendingAction.internship.title}"? This can't be undone.`
              : `End "${pendingAction.internship.title}" as an active listing? Students won't be able to apply anymore, but you can reopen it later.`
          }
          confirmLabel={pendingAction.type === 'delete' ? 'Delete' : 'Close listing'}
          danger
          busy={actionBusy}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
