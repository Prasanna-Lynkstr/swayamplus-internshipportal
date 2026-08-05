'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import type { Internship, InternshipApplication, ApplicationStatus } from '@/lib/types';

const STATUS_TONE: Record<string, 'orange' | 'good' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  published: 'good',
  closed: 'danger',
  archived: 'neutral',
};

function ApplicantsPanel({ internshipId, token }: { internshipId: number; token: string | null }) {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<InternshipApplication[]>(`/internships/${internshipId}/applications`, { token })
      .then(setApplications)
      .catch(() => setError('Could not load applicants. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [internshipId, token]);

  const updateStatus = async (applicationId: number, status: ApplicationStatus) => {
    try {
      await apiFetch(`/applications/${applicationId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      load();
    } catch {
      setError('Could not update this application. Please try again.');
    }
  };

  if (loading) return <p className="p-4 text-sm text-sp-ink-3">Loading applicants…</p>;
  if (error) return <p className="p-4 text-sm font-semibold text-sp-danger">{error}</p>;
  if (applications.length === 0)
    return <p className="p-4 text-sm text-sp-ink-3">No applicants yet.</p>;

  return (
    <div className="flex flex-col divide-y divide-black/5">
      {applications.map((app) => (
        <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="font-bold text-sp-navy">{app.student?.fullName ?? 'Unnamed student'}</p>
            <p className="text-xs text-sp-ink-3">
              {app.student?.collegeName ?? 'No college on file'} · Applied{' '}
              {new Date(app.createdAt).toLocaleDateString('en-IN')}
            </p>
            {app.coverNote && <p className="mt-1 text-sm text-sp-ink-2">&ldquo;{app.coverNote}&rdquo;</p>}
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
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EmployerDashboardPage() {
  const { token } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<Internship[]>('/internships/mine', { token })
      .then(setInternships)
      .catch(() => setError('Could not load your internships. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const publish = async (id: number) => {
    try {
      await apiFetch(`/internships/${id}/publish`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not publish this internship. Please try again.');
    }
  };
  const close = async (id: number) => {
    try {
      await apiFetch(`/internships/${id}/close`, { method: 'PATCH', token });
      load();
    } catch {
      setError('Could not close this internship. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-sp-navy">Your internships</h1>
        <Link href="/employer/post">
          <Button withArrow>Post an internship</Button>
        </Link>
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : internships.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">
          You haven&apos;t posted any internships yet.
        </Card>
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
                    {internship.domain} · {internship.mode} · {internship.durationWeeks} weeks
                  </p>
                </div>
                <div className="flex gap-2">
                  {internship.status === 'draft' && (
                    <Button variant="secondary" onClick={() => publish(internship.id)}>
                      Publish
                    </Button>
                  )}
                  {internship.status === 'published' && (
                    <Button variant="secondary" onClick={() => close(internship.id)}>
                      Close
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
    </div>
  );
}
