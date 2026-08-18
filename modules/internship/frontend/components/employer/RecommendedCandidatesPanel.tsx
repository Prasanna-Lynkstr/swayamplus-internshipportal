'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CandidateListRow } from './CandidateListRow';
import type { Candidate, PaginatedResult } from '@/lib/types';

// Ranked against one specific listing — mirrors ApplicantsPanel's own
// fetch/paginate shape, but calls the recommended-candidates endpoint
// instead of the applications one. Students who already applied to this
// internship are excluded server-side (see CandidatesService), so this
// never duplicates rows the Applicants panel above it already shows.
export function RecommendedCandidatesPanel({ internshipId, token }: { internshipId: string; token: string | null }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    apiFetch<PaginatedResult<Candidate>>(`/internships/${internshipId}/recommended-candidates?page=${page}`, {
      token,
    })
      .then((result) => {
        setCandidates(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => setLoadError('Could not load recommended candidates. Please try again.'))
      .finally(() => setLoading(false));
  }, [internshipId, token, page]);

  if (loadError) return <p className="p-4 text-sm font-semibold text-sp-danger">{loadError}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-sp-ink-3">
        {loading
          ? 'Loading…'
          : `${total} matching candidate${total === 1 ? '' : 's'} — ranked by skills and stated preferences`}
      </p>
      {!loading && candidates.length === 0 && (
        <p className="py-4 text-sm text-sp-ink-3">
          No matching candidates yet — try again once more students have registered or updated their profile.
        </p>
      )}
      {candidates.map((candidate) => (
        <CandidateListRow key={candidate.id} candidate={candidate} token={token} />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Prev
          </Button>
          <span className="text-sm text-sp-ink-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
