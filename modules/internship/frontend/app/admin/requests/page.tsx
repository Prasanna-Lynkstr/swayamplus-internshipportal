'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch, downloadCsv } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { InternshipRequest, PaginatedResult } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<InternshipRequest> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminRequestsPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<PaginatedResult<InternshipRequest>>(EMPTY_RESULT);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      await downloadCsv(`/admin/internship-requests/export?${params.toString()}`, token, 'internship-requests.csv');
    } catch {
      setExportError('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);
      apiFetch<PaginatedResult<InternshipRequest>>(`/admin/internship-requests?${params.toString()}`, {
        token,
      })
        .then(setResult)
        .catch(() => setError('Could not load internship requests. Please refresh the page.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [token, q, page]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Categories and roles students couldn&apos;t find a match for — use this as a signal for
          which employers to bring on.
        </p>
      </div>

      <AdminTabs />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-sp-ink-2">
          {result.total} request{result.total === 1 ? '' : 's'}
        </span>
        <div className="w-64">
          <Input
            placeholder="Search domain or student email"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="secondary" disabled={exporting} onClick={handleExport}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {exportError && <p className="text-sm font-semibold text-sp-danger">{exportError}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-sp-danger">{error}</p>
      ) : result.items.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">No requests yet.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.items.map((req) => (
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
