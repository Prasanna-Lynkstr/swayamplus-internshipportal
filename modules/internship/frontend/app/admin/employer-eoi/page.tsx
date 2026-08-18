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
import { EmployerEoiSubmissionModal } from '@/components/admin/EmployerEoiSubmissionModal';
import { EMPLOYER_VERIFICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
import type { EmployerEoi, PaginatedResult } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<EmployerEoi> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminEmployerEoiPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<PaginatedResult<EmployerEoi>>(EMPTY_RESULT);
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewing, setViewing] = useState<EmployerEoi | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    eoi: EmployerEoi;
    verdict: 'approved' | 'rejected';
  } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    apiFetch<PaginatedResult<EmployerEoi>>(`/admin/employer-eoi?${params.toString()}`, { token })
      .then(setResult)
      .catch(() => setLoadError('Could not load submissions. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, q, page]);

  const decide = async (id: number, verdict: 'approved' | 'rejected') => {
    setActionError('');
    try {
      await apiFetch(`/admin/employer-eoi/${id}/decision`, {
        method: 'PATCH',
        token,
        body: { status: verdict },
      });
      load();
    } catch {
      setActionError('Could not decide this submission. Please try again.');
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    setDecisionBusy(true);
    try {
      await decide(pendingDecision.eoi.id, pendingDecision.verdict);
    } finally {
      setDecisionBusy(false);
      setPendingDecision(null);
    }
  };

  // Same "close the modal before opening the confirm toast" choreography as
  // admin/employers/page.tsx — two full-screen overlays at once is one too
  // many.
  const requestDecision = (eoi: EmployerEoi, verdict: 'approved' | 'rejected') => {
    setViewing(null);
    setPendingDecision({ eoi, verdict });
  };

  const handleUpdated = (updated: EmployerEoi) => {
    setViewing(updated);
    load();
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Review Expressions of Interest from prospective employers — approving one creates a real
          employer account.
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
              <h2 className="text-lg font-bold text-sp-navy">Submissions ({result.total})</h2>
              <div className="w-44">
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="pending">Pending review</option>
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
              <Card className="p-10 text-center text-sp-ink-3">No submissions match this filter.</Card>
            ) : (
              <div className="flex flex-col gap-4">
                {result.items.map((eoi) => (
                  <Card
                    key={eoi.id}
                    className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[EMPLOYER_VERIFICATION_STATUS_TONE[eoi.status]]}`}
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(eoi)}
                          className="font-bold text-sp-navy underline decoration-dotted underline-offset-2 hover:text-sp-blue"
                        >
                          {eoi.organizationName}
                        </button>
                        <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[eoi.status]}>{eoi.status}</Badge>
                        {eoi.status === 'pending' && eoi.emailInUse && (
                          <Badge tone="danger">email in use</Badge>
                        )}
                      </div>
                      <p className="text-sm text-sp-ink-3">
                        {eoi.email} · {eoi.hqCity} · CIN {eoi.cin} · {eoi.headcount} employees
                      </p>
                      <p className="text-xs text-sp-ink-3">
                        Submitted {new Date(eoi.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      <p className="mt-1 text-sm font-bold text-sp-navy">
                        Applied by: {eoi.contactPersonName} · {eoi.contactPersonPhone}
                      </p>
                      <p className="mt-1 max-w-xl text-sm text-sp-ink-2">&ldquo;{eoi.reasonForEoi}&rdquo;</p>
                      {eoi.internshipTypesExpected.length > 0 && (
                        <p className="mt-1 text-xs text-sp-ink-3">
                          Expects: {eoi.internshipTypesExpected.join(', ')}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3">
                        <a
                          href={resolveFileUrl(eoi.certificateOfIncorporationUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-sp-blue"
                        >
                          View Certificate of Incorporation
                        </a>
                        <a href={eoi.linkedinBusinessPage} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sp-blue">
                          LinkedIn page
                        </a>
                        <a href={eoi.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sp-blue">
                          Website
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="secondary" onClick={() => setViewing(eoi)}>
                        View details
                      </Button>
                      {eoi.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => requestDecision(eoi, 'rejected')}>
                            Reject
                          </Button>
                          <Button disabled={eoi.emailInUse} onClick={() => requestDecision(eoi, 'approved')}>
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {result.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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

      <EmployerEoiSubmissionModal
        eoi={viewing}
        onClose={() => setViewing(null)}
        onApprove={(eoi) => requestDecision(eoi, 'approved')}
        onReject={(eoi) => requestDecision(eoi, 'rejected')}
        onUpdated={handleUpdated}
      />

      {pendingDecision && (
        <ConfirmToast
          message={
            pendingDecision.verdict === 'approved'
              ? `Create an employer account for ${pendingDecision.eoi.email} and approve this submission?`
              : `Reject ${pendingDecision.eoi.organizationName}'s Expression of Interest?`
          }
          confirmLabel={pendingDecision.verdict === 'approved' ? 'Approve' : 'Reject'}
          danger={pendingDecision.verdict === 'rejected'}
          busy={decisionBusy}
          onConfirm={confirmDecision}
          onCancel={() => setPendingDecision(null)}
        />
      )}
    </div>
  );
}
