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
import { InternshipDetailsModal } from '@/components/admin/InternshipDetailsModal';
import { INTERNSHIP_STATUS_TONE, STATUS_TONE_BORDER, internshipStatusLabel } from '@/lib/status-labels';
import type { Internship, PaginatedResult } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<Internship> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

const TAKEDOWN_ELIGIBLE_STATUSES = new Set(['published', 'pending_review']);

type PendingAction =
  | { kind: 'moderate'; internship: Internship; decision: 'approved' | 'rejected' }
  | { kind: 'takedown'; internships: Internship[] };

export default function AdminInternshipsPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<PaginatedResult<Internship>>(EMPTY_RESULT);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingInternship, setViewingInternship] = useState<Internship | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

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

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Requesting a decision/takedown from inside the details modal closes the
  // modal right away rather than stacking the confirm toast on top of it —
  // see the equivalent fix on the employer EOI modal for why that matters.
  const requestModeration = (internship: Internship, decision: 'approved' | 'rejected') => {
    setViewingInternship(null);
    setPendingAction({ kind: 'moderate', internship, decision });
  };

  const requestTakeDown = (internships: Internship[]) => {
    setViewingInternship(null);
    setPendingAction({ kind: 'takedown', internships });
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    setError('');
    try {
      if (pendingAction.kind === 'moderate') {
        await apiFetch(`/admin/internships/${pendingAction.internship.id}/moderate`, {
          method: 'PATCH',
          token,
          body: { decision: pendingAction.decision },
        });
      } else {
        await apiFetch('/admin/internships/takedown', {
          method: 'PATCH',
          token,
          body: { ids: pendingAction.internships.map((i) => i.id) },
        });
        setSelectedIds(new Set());
      }
      load();
    } catch {
      setError('Could not update the selected internship(s). Please try again.');
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const selectedInternships = result.items.filter((i) => selectedIds.has(i.id));

  const toastMessage = (() => {
    if (!pendingAction) return '';
    if (pendingAction.kind === 'moderate') {
      const verb = pendingAction.decision === 'approved' ? 'Approve' : 'Reject';
      return `${verb} "${pendingAction.internship.title}"?`;
    }
    const count = pendingAction.internships.length;
    if (count === 1) return `Take down "${pendingAction.internships[0].title}"?`;
    return `Take down ${count} internships?`;
  })();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Every internship on the platform, regardless of status or employer.
        </p>
      </div>

      <AdminTabs />

      <div className="flex flex-wrap items-center gap-3">
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
        {selectedInternships.length > 0 && (
          <Button variant="secondary" onClick={() => requestTakeDown(selectedInternships)}>
            Take down selected ({selectedInternships.length})
          </Button>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : result.items.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">No internships match this filter.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.items.map((internship) => {
            const canTakeDown = TAKEDOWN_ELIGIBLE_STATUSES.has(internship.status);
            return (
              <Card
                key={internship.id}
                className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[INTERNSHIP_STATUS_TONE[internship.status]]}`}
              >
                <div className="flex items-start gap-3">
                  {canTakeDown && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(internship.id)}
                      onChange={() => toggleSelected(internship.id)}
                      aria-label={`Select ${internship.title}`}
                      className="mt-1.5 h-4 w-4 shrink-0 accent-sp-orange"
                    />
                  )}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingInternship(internship)}
                        className="font-bold text-sp-navy underline decoration-dotted underline-offset-2 hover:text-sp-blue"
                      >
                        {internship.title}
                      </button>
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
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setViewingInternship(internship)}>
                    View details
                  </Button>
                  {internship.status === 'pending_review' && (
                    <>
                      <Button variant="secondary" onClick={() => requestModeration(internship, 'rejected')}>
                        Reject
                      </Button>
                      <Button onClick={() => requestModeration(internship, 'approved')}>Approve</Button>
                    </>
                  )}
                  {canTakeDown && internship.status === 'published' && (
                    <Button variant="secondary" onClick={() => requestTakeDown([internship])}>
                      Take down
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
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

      <InternshipDetailsModal
        internship={viewingInternship}
        onClose={() => setViewingInternship(null)}
        onApprove={(internship) => requestModeration(internship, 'approved')}
        onReject={(internship) => requestModeration(internship, 'rejected')}
        onTakeDown={(internship) => requestTakeDown([internship])}
      />

      {pendingAction && (
        <ConfirmToast
          message={toastMessage}
          confirmLabel={pendingAction.kind === 'moderate' && pendingAction.decision === 'approved' ? 'Approve' : pendingAction.kind === 'moderate' ? 'Reject' : 'Take down'}
          danger={pendingAction.kind === 'takedown' || pendingAction.decision === 'rejected'}
          busy={actionBusy}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
