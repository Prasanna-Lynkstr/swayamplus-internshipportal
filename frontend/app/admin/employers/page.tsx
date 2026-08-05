'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Employer, PaginatedResult } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<Employer> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminEmployersPage() {
  const { token } = useAuth();
  const [pending, setPending] = useState<PaginatedResult<Employer>>(EMPTY_RESULT);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // Separate from actionError: a load failure means there's no data to show,
  // so it's fine to replace the whole page with it. An action failure (below)
  // happens after data is already loaded and should never hide that data.
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    apiFetch<PaginatedResult<Employer>>(`/admin/employers/pending?${params.toString()}`, { token })
      .then(setPending)
      .catch(() => setLoadError('Could not load pending employers. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [token, q, page]);

  const decide = async (employerId: number, status: 'approved' | 'rejected') => {
    setActionError('');
    try {
      await apiFetch(`/admin/employers/${employerId}/verify`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      load();
    } catch {
      setActionError('Could not update this employer. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Review and approve employer registrations.</p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : loadError ? (
        <p className="text-sm font-semibold text-sp-danger">{loadError}</p>
      ) : (
        <>
      {actionError && <p className="text-sm font-semibold text-sp-danger">{actionError}</p>}

      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-sp-navy">Pending verification ({pending.total})</h2>
          <div className="w-64">
            <Input
              placeholder="Search organization or email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {pending.items.length === 0 ? (
          <Card className="p-10 text-center text-sp-ink-3">No employers awaiting review.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.items.map((employer) => (
              <Card key={employer.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-bold text-sp-navy">{employer.organizationName}</h3>
                    <Badge tone="orange">{employer.verificationStatus}</Badge>
                  </div>
                  <p className="text-sm text-sp-ink-3">
                    {employer.user?.identifier} · {employer.hqCity ?? 'City not set'}
                  </p>
                  {employer.verificationDocumentUrl ? (
                    <a
                      href={resolveFileUrl(employer.verificationDocumentUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-sp-blue"
                    >
                      View verification document
                    </a>
                  ) : (
                    <p className="text-sm text-sp-ink-3">No document uploaded yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => decide(employer.id, 'rejected')}>
                    Reject
                  </Button>
                  <Button onClick={() => decide(employer.id, 'approved')}>Approve</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {pending.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </Button>
            <span className="text-sm text-sp-ink-2">
              Page {pending.page} of {pending.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= pending.totalPages}
              onClick={() => setPage((p) => Math.min(pending.totalPages, p + 1))}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
