'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { InternshipApplication, PaginatedResult } from '@/lib/types';

const STATUS_TONE: Record<string, 'orange' | 'good' | 'danger' | 'neutral'> = {
  applied: 'neutral',
  shortlisted: 'orange',
  interviewing: 'orange',
  offered: 'good',
  rejected: 'danger',
  withdrawn: 'neutral',
};

export default function MyApplicationsPage() {
  const { user, token } = useAuth();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
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
      <h1 className="text-2xl font-extrabold text-sp-navy">Your applications</h1>
      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
      {applications.length === 0 ? (
        !error && (
          <Card className="p-10 text-center text-sp-ink-3">
            You haven&apos;t applied to any internships yet.{' '}
            <Link href="/internships" className="font-bold text-sp-blue">
              Browse internships →
            </Link>
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Link href={`/internships/${app.internshipId}`} className="font-bold text-sp-navy hover:underline">
                    {app.internship?.title ?? 'Internship'}
                  </Link>
                  <Badge tone={STATUS_TONE[app.status]}>{app.status}</Badge>
                </div>
                <p className="text-sm text-sp-ink-3">
                  {app.internship?.employer?.organizationName} · Applied{' '}
                  {new Date(app.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              {app.status !== 'withdrawn' && !['rejected', 'offered'].includes(app.status) && (
                <Button variant="secondary" onClick={() => withdraw(app.id)}>
                  Withdraw
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
