'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import type {
  Employer,
  EmployerDashboardStats,
  Internship,
  InternshipApplication,
  ApplicationNote,
  ApplicationStatus,
  PaginatedResult,
} from '@/lib/types';

const STATUS_TONE: Record<string, 'orange' | 'good' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  published: 'good',
  closed: 'danger',
  archived: 'neutral',
};

function ApplicantNotes({ applicationId, token }: { applicationId: number; token: string | null }) {
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    apiFetch<ApplicationNote[]>(`/applications/${applicationId}/notes`, { token })
      .then(setNotes)
      .finally(() => setLoading(false));
  };

  useEffect(load, [applicationId, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/applications/${applicationId}/notes`, {
        method: 'POST',
        token,
        body: { note: draft.trim() },
      });
      setDraft('');
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-sp-lg bg-sp-bg-sunken p-3">
      {loading ? (
        <p className="text-xs text-sp-ink-3">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-sp-ink-3">No notes yet.</p>
      ) : (
        <ul className="mb-2 flex flex-col gap-1.5">
          {notes.map((n) => (
            <li key={n.id} className="text-xs text-sp-ink-2">
              <span className="font-semibold text-sp-navy">{n.author?.identifier ?? 'Unknown'}</span>{' '}
              <span className="text-sp-ink-3">
                {new Date(n.createdAt).toLocaleString('en-IN')}
              </span>
              <p>{n.note}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this applicant…"
          className="flex-1 rounded-sp-md border border-black/10 px-2 py-1 text-xs outline-none focus:border-sp-blue"
        />
        <Button type="submit" variant="secondary" disabled={saving || !draft.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}

function ApplicantsPanel({ internshipId, token }: { internshipId: number; token: string | null }) {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [notesOpenFor, setNotesOpenFor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Separate from actionError for the same reason as EmployerDashboardPage below:
  // a status-update failure shouldn't hide applicants that already loaded fine.
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    apiFetch<PaginatedResult<InternshipApplication>>(`/internships/${internshipId}/applications`, { token })
      .then((result) => setApplications(result.items))
      .catch(() => setLoadError('Could not load applicants. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [internshipId, token]);

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

  if (loading) return <p className="p-4 text-sm text-sp-ink-3">Loading applicants…</p>;
  if (loadError) return <p className="p-4 text-sm font-semibold text-sp-danger">{loadError}</p>;
  if (applications.length === 0)
    return <p className="p-4 text-sm text-sp-ink-3">No applicants yet.</p>;

  return (
    <div className="flex flex-col divide-y divide-black/5">
      {actionError && (
        <p className="pb-2 text-sm font-semibold text-sp-danger">{actionError}</p>
      )}
      {applications.map((app) => (
        <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="font-bold text-sp-navy">{app.student?.fullName ?? 'Unnamed student'}</p>
            <p className="text-xs text-sp-ink-3">
              {app.student?.collegeName ?? 'No college on file'} · Applied{' '}
              {new Date(app.createdAt).toLocaleDateString('en-IN')}
            </p>
            {app.coverNote && <p className="mt-1 text-sm text-sp-ink-2">&ldquo;{app.coverNote}&rdquo;</p>}
            {app.checklistResponses.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {app.checklistResponses.map((r) => (
                  <li key={r.item} className="text-xs text-sp-ink-3">
                    {r.met ? '✅' : '⬜️'} {r.item}
                  </li>
                ))}
              </ul>
            )}
            {app.student?.resumeUrl && (
              <a
                href={resolveFileUrl(app.student.resumeUrl)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-sp-blue"
              >
                View resume
              </a>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge tone={app.status === 'rejected' ? 'danger' : app.status === 'offered' ? 'good' : 'neutral'}>
                {app.status}
              </Badge>
              {app.status !== 'withdrawn' && (
                <Select
                  value=""
                  onChange={(e) => e.target.value && updateStatus(app.id, e.target.value as ApplicationStatus)}
                >
                  <option value="">Update status…</option>
                  <option value="shortlisted">Shortlist</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offer</option>
                  <option value="rejected">Reject</option>
                </Select>
              )}
              <Button
                variant="ghost"
                onClick={() => setNotesOpenFor(notesOpenFor === app.id ? null : app.id)}
              >
                Notes
              </Button>
            </div>
            {notesOpenFor === app.id && (
              <div className="w-full min-w-[16rem]">
                <ApplicantNotes applicationId={app.id} token={token} />
              </div>
            )}
          </div>
        </div>
      ))}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'close' | 'delete';
    internship: Internship;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token })
      .then((employer) => setMissingFields(employer.profileComplete ? null : employer.missingFields ?? []))
      .catch(() => setMissingFields(null));
  }, [token]);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<PaginatedResult<Internship>>('/internships/mine', { token }),
      apiFetch<EmployerDashboardStats>('/employers/me/dashboard', { token }),
    ])
      .then(([internshipsResult, statsResult]) => {
        setInternships(internshipsResult.items);
        setStats(statsResult);
      })
      .catch(() => setError('Could not load your internships. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (missingFields === null) load();
  }, [token, missingFields]);

  // publish() also reopens a closed listing — the backend sets status to
  // 'published' unconditionally, regardless of what it was before.
  const publish = async (id: number) => {
    try {
      await apiFetch(`/internships/${id}/publish`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not publish this internship. Please try again.');
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
          <Link href="/register/employer">
            <Button withArrow>Complete your profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-sp-navy">Your internships</h1>
        <Link href="/employer/post">
          <Button withArrow>Post an internship</Button>
        </Link>
      </div>

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
          <Card pastel="lavender" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Awaiting review</p>
            <p className="mt-2 text-3xl font-extrabold text-sp-navy">{stats.applications.pendingReview}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">Applicants not yet actioned</p>
          </Card>
          <Card pastel="mint" className="p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">Verification status</p>
            <p className="mt-2 text-3xl font-extrabold capitalize text-sp-navy">{stats.verificationStatus}</p>
            <p className="mt-1 text-xs font-semibold text-sp-ink-3">Your organization&apos;s status</p>
          </Card>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : internships.length === 0 ? (
        !error && (
          <Card className="p-10 text-center text-sp-ink-3">
            You haven&apos;t posted any internships yet.
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {internships.map((internship) => (
            <Card key={internship.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-lg font-bold text-sp-navy">{internship.title}</h3>
                    <Badge tone={STATUS_TONE[internship.status]}>{internship.status}</Badge>
                  </div>
                  <p className="text-sm text-sp-ink-3">
                    {internship.category} · {internship.mode} · {internship.durationWeeks} weeks
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {internship.status === 'draft' && (
                    <Button variant="secondary" onClick={() => publish(internship.id)}>
                      Publish
                    </Button>
                  )}
                  {internship.status === 'published' && (
                    <Button
                      variant="secondary"
                      onClick={() => setPendingAction({ type: 'close', internship })}
                    >
                      Close
                    </Button>
                  )}
                  {internship.status === 'closed' && (
                    <Button variant="secondary" onClick={() => publish(internship.id)}>
                      Reopen
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
                  <Button
                    variant="ghost"
                    onClick={() => setExpanded(expanded === internship.id ? null : internship.id)}
                  >
                    {expanded === internship.id ? 'Hide applicants' : 'View applicants'}
                  </Button>
                </div>
              </div>
              {expanded === internship.id && (
                <div className="mt-4 border-t border-black/5 pt-2">
                  <ApplicantsPanel internshipId={internship.id} token={token} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {pendingAction && (
        <ConfirmToast
          message={
            pendingAction.type === 'delete'
              ? `Permanently delete "${pendingAction.internship.title}"? This can't be undone.`
              : `Close "${pendingAction.internship.title}"? Students won't be able to apply anymore, but you can reopen it later.`
          }
          confirmLabel={pendingAction.type === 'delete' ? 'Delete' : 'Close'}
          danger={pendingAction.type === 'delete'}
          busy={actionBusy}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
