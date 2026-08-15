'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import { INTERNSHIP_STATUS_TONE, STATUS_TONE_BORDER, internshipStatusLabel } from '@/lib/status-labels';
import type { Internship, PaginatedResult } from '@/lib/types';

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
  const [pendingReject, setPendingReject] = useState<Internship | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    apiFetch<PaginatedResult<Internship>>(`/admin/internships?${params.toString()}`, { token })
      .then(setResult)
      .catch(() => setError('Could not load internships. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [token, status, q, page]);

  const moderate = async (internshipId: number, decision: 'approved' | 'rejected') => {
    setError('');
    try {
      await apiFetch(`/admin/internships/${internshipId}/moderate`, {
        method: 'PATCH',
        token,
        body: { decision },
      });
      load();
    } catch {
      setError('Could not update this internship. Please try again.');
    }
  };

  const confirmReject = async () => {
    if (!pendingReject) return;
    setRejectBusy(true);
    try {
      await moderate(pendingReject.id, 'rejected');
    } finally {
      setRejectBusy(false);
      setPendingReject(null);
    }
  };

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
            <option value="pending_review">Pending review</option>
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
            <Card
              key={internship.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[INTERNSHIP_STATUS_TONE[internship.status]]}`}
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-bold text-sp-navy">{internship.title}</h3>
                  <Badge tone={INTERNSHIP_STATUS_TONE[internship.status]}>
                    {internshipStatusLabel(internship.status)}
                  </Badge>
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
              {internship.status === 'pending_review' && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setPendingReject(internship)}>
                    Reject
                  </Button>
                  <Button onClick={() => moderate(internship.id, 'approved')}>Approve</Button>
                </div>
              )}
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

      {pendingReject && (
        <ConfirmToast
          message={`Reject "${pendingReject.title}"?`}
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
