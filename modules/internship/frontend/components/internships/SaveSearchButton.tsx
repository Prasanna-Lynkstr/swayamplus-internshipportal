'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSavedSearches } from '@/lib/useSavedSearches';
import type { InternshipFilterParams } from '@/lib/internshipFilters';

interface Props {
  currentParams: InternshipFilterParams;
  hasActiveFilters: boolean;
}

// Signed-in students only — an anonymous visitor or an employer/admin
// browsing has nothing to attach a saved search to. Reference's "save this
// search as alert" becomes a real account-backed saved search instead.
export function SaveSearchButton({ currentParams, hasActiveFilters }: Props) {
  const { user } = useAuth();
  const { matchesSaved, saveCurrent, remove } = useSavedSearches();
  const [busy, setBusy] = useState(false);

  if (user?.role !== 'student') return null;

  const existing = matchesSaved(currentParams);

  const onClick = async () => {
    setBusy(true);
    try {
      if (existing) {
        await remove(existing.id);
      } else {
        await saveCurrent(currentParams);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || (!existing && !hasActiveFilters)}
      title={!existing && !hasActiveFilters ? 'Apply at least one filter to save this search' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold shadow-sm shadow-black/5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        existing
          ? 'border-sp-good bg-sp-good-soft text-sp-good-ink'
          : 'border-black/10 bg-sp-bg-elev text-sp-ink-2 hover:border-sp-orange/50'
      }`}
    >
      {existing ? '✓ Saved — remove' : '☆ Save this search'}
    </button>
  );
}
