'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import type { InternshipRequest } from '@/lib/types';

export default function AdminRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<InternshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<InternshipRequest[]>('/admin/internship-requests', { token })
      .then(setRequests)
      .catch(() => setError('Could not load internship requests. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Domains and roles students couldn&apos;t find a match for — use this as a signal for
          which employers to bring on.
        </p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-sp-danger">{error}</p>
      ) : requests.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">No requests yet.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((req) => (
            <Card key={req.id} className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold text-sp-navy">{req.domain}</h3>
                <span className="text-xs text-sp-ink-3">
                  {new Date(req.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm text-sp-ink-3">
                {req.student?.fullName ?? 'Unnamed student'} · {req.student?.user?.identifier}
                {req.student?.collegeName ? ` · ${req.student.collegeName}` : ''}
              </p>
              {req.notes && <p className="mt-2 text-sm text-sp-ink-2">&ldquo;{req.notes}&rdquo;</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
