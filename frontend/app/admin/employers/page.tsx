'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import { EMPLOYER_VERIFICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
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
  const [result, setResult] = useState<PaginatedResult<Employer>>(EMPTY_RESULT);
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // Separate from actionError: a load failure means there's no data to show,
  // so it's fine to replace the whole page with it. An action failure (below)
  // happens after data is already loaded and should never hide that data.
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingReject, setPendingReject] = useState<Employer | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    apiFetch<PaginatedResult<Employer>>(`/admin/employers/pending?${params.toString()}`, { token })
      .then(setResult)
      .catch(() => setLoadError('Could not load employers. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [token, status, q, page]);

  const decide = async (employerId: number, verdict: 'approved' | 'rejected') => {
    setActionError('');
    try {
      await apiFetch(`/admin/employers/${employerId}/verify`, {
        method: 'PATCH',
        token,
        body: { status: verdict },
      });
      load();
    } catch {
      setActionError('Could not update this employer. Please try again.');
    }
  };

  const confirmReject = async () => {
    if (!pendingReject) return;
    setRejectBusy(true);
    try {
      await decide(pendingReject.id, 'rejected');
    } finally {
      setRejectBusy(false);
      setPendingReject(null);
    }
  };

  const toggleModerationMode = async (employer: Employer) => {
    setActionError('');
    try {
      await apiFetch(`/admin/employers/${employer.id}/moderation`, {
        method: 'PATCH',
        token,
        body: {
          moderationMode: employer.moderationMode === 'review' ? 'auto_publish' : 'review',
        },
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
        <p className="mt-1 text-sp-ink-2">
          Review employer registrations and set per-employer posting moderation.
        </p>
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
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-sp-navy">Employers ({result.total})</h2>
              <div className="w-44">
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="pending">Pending verification</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="">All</option>
                </Select>
              </div>
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
            {result.items.length === 0 ? (
              <Card className="p-10 text-center text-sp-ink-3">No employers match this filter.</Card>
            ) : (
              <div className="flex flex-col gap-4">
                {result.items.map((employer) => (
                  <Card
                    key={employer.id}
                    className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]]}`}
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-bold text-sp-navy">{employer.organizationName}</h3>
                        <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]}>
                          {employer.verificationStatus}
                        </Badge>
                        {employer.moderationMode === 'review' && (
                          <Badge tone="orange">postings need review</Badge>
                        )}
                      </div>
                      <p className="text-sm text-sp-ink-3">
                        {employer.user?.identifier} · {employer.hqCity ?? 'City not set'}
                        {employer.cin ? ` · CIN ${employer.cin}` : ''}
                        {employer.headcount ? ` · ${employer.headcount} employees` : ''}
                      </p>
                      {(employer.contactPersonName || employer.contactPersonPhone) && (
                        <p className="text-sm text-sp-ink-3">
                          Contact: {employer.contactPersonName ?? 'Not set'}
                          {employer.contactPersonPhone ? ` · ${employer.contactPersonPhone}` : ''}
                        </p>
                      )}
                      {employer.reasonForEoi && (
                        <p className="mt-1 max-w-xl text-sm text-sp-ink-2">
                          &ldquo;{employer.reasonForEoi}&rdquo;
                        </p>
                      )}
                      {employer.internshipTypesExpected.length > 0 && (
                        <p className="mt-1 text-xs text-sp-ink-3">
                          Expects: {employer.internshipTypesExpected.join(', ')}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3">
                        {employer.certificateOfIncorporationUrl ? (
                          <a
                            href={resolveFileUrl(employer.certificateOfIncorporationUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sp-blue"
                          >
                            View Certificate of Incorporation
                          </a>
                        ) : (
                          <p className="text-sm text-sp-ink-3">No certificate uploaded yet.</p>
                        )}
                        {employer.linkedinBusinessPage && (
                          <a
                            href={employer.linkedinBusinessPage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sp-blue"
                          >
                            LinkedIn page
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {employer.verificationStatus === 'pending' ? (
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setPendingReject(employer)}>
                            Reject
                          </Button>
                          <Button onClick={() => decide(employer.id, 'approved')}>Approve</Button>
                        </div>
                      ) : (
                        employer.verificationStatus === 'approved' && (
                          <Button variant="secondary" onClick={() => toggleModerationMode(employer)}>
                            {employer.moderationMode === 'review'
                              ? 'Switch to auto-publish'
                              : 'Require posting review'}
                          </Button>
                        )
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {result.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
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
        </>
      )}

      {pendingReject && (
        <ConfirmToast
          message={`Reject ${pendingReject.organizationName ?? 'this employer'}'s EOI?`}
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
