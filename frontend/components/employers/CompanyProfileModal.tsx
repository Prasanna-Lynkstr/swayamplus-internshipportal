'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/Card';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { CompanyProfileHeader } from '@/components/employers/CompanyProfileHeader';
import { apiFetch } from '@/lib/api';
import type { PaginatedInternships, PublicEmployerProfile } from '@/lib/types';

interface Props {
  employerId: number;
  open: boolean;
  onClose: () => void;
}

const EMPTY_RESULT: PaginatedInternships = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };

// The full company profile — logo, details, and every open internship,
// paginated — rendered inline as a large modal instead of navigating to
// /employers/:id. Same content as that page, just fetched and paged with
// local state instead of a server render + URL params, since there's no
// navigation happening.
export function CompanyProfileModal({ employerId, open, onClose }: Props) {
  const [employer, setEmployer] = useState<PublicEmployerProfile | null>(null);
  const [result, setResult] = useState<PaginatedInternships>(EMPTY_RESULT);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setError('');
    apiFetch<PublicEmployerProfile>(`/employers/${employerId}/public`)
      .then(setEmployer)
      .catch(() => setError("Could not load this company's profile."));
  }, [open, employerId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<PaginatedInternships>(`/internships?employerId=${employerId}&page=${page}`)
      .then(setResult)
      .catch(() => setError("Could not load this company's internships."))
      .finally(() => setLoading(false));
  }, [open, employerId, page]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const { items, total, totalPages } = result;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Company profile"
      onClick={(e) => {
        // Portals escape the DOM tree for rendering, but React's synthetic
        // events still bubble through the *React* tree — and this modal is
        // rendered from inside a card that's itself wrapped in a <Link>
        // (see EmployerNameTrigger). Without stopping here, closing via a
        // backdrop click would keep bubbling into that Link and navigate to
        // the internship detail page right as the modal closes.
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-sp-xl bg-sp-bg-elev shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-sp-ink-2">
            Company profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-navy"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <p className="text-center text-sm font-semibold text-sp-danger">{error}</p>
          ) : !employer ? (
            <p className="text-center text-sm text-sp-ink-3">Loading…</p>
          ) : (
            <div className="flex flex-col gap-6">
              <CompanyProfileHeader employer={employer} />

              <h3 className="text-lg font-bold text-sp-navy">
                {total} open internship{total === 1 ? '' : 's'}
              </h3>

              {loading ? (
                <p className="text-sm text-sp-ink-3">Loading…</p>
              ) : items.length === 0 ? (
                <Card className="p-10 text-center text-sp-ink-3">
                  No open internships from this employer right now.
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {items.map((internship) => (
                    <InternshipCard key={internship.id} internship={internship} />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-3 pb-2" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-9 items-center rounded-full bg-sp-bg-sunken px-4 text-sm font-bold text-sp-ink-2 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-sp-ink-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-9 items-center rounded-full bg-sp-bg-sunken px-4 text-sm font-bold text-sp-ink-2 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
