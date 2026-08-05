'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { Internship, InternshipStatus, PaginatedResult } from '@/lib/types';

const STATUS_TONE: Record<InternshipStatus, 'orange' | 'good' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  published: 'good',
  closed: 'danger',
  archived: 'neutral',
};

const EMPTY_RESULT: PaginatedResult<Internship> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminInternshipsPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<PaginatedResult<Internship>>(EMPTY_RESULT);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      apiFetch<PaginatedResult<Internship>>(`/admin/internships?${params.toString()}`, { token })
        .then(setResult)
        .catch(() => setError('Could not load internships. Please refresh the page.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [token, status, q, page]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Every internship on the platform, regardless of status or employer.
        </p>
      </div>

      <AdminTabs />

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-sp-ink-2">
          {result.total} internship{result.total === 1 ? '' : 's'}
        </span>
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search title or employer"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : result.items.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">No internships match this filter.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.items.map((internship) => (
            <Card key={internship.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-bold text-sp-navy">{internship.title}</h3>
                  <Badge tone={STATUS_TONE[internship.status]}>{internship.status}</Badge>
                </div>
                <p className="text-sm text-sp-ink-3">
                  {internship.employer?.organizationName ?? 'Unknown employer'}
                  {internship.employer?.verificationStatus
                    ? ` (${internship.employer.verificationStatus})`
                    : ''}{' '}
                  · {internship.category} · {internship.mode}
                </p>
                <p className="text-xs text-sp-ink-3">
                  Posted {new Date(internship.createdAt).toLocaleDateString('en-IN')} · Deadline{' '}
                  {new Date(internship.applicationDeadline).toLocaleDateString('en-IN')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-sm text-sp-ink-2">
            Page {result.page} of {result.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
