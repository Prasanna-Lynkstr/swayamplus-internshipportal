'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import { useAuth } from './auth';
import { FILTER_KEYS } from './internshipFilters';
import type { InternshipFilterParams } from './internshipFilters';
import type { PaginatedResult, SavedSearch } from './types';

// Restricts a filter-params object down to the same keys a saved search is
// allowed to carry, dropping `page` and anything falsy — used both to build
// the payload sent to the backend and to compare "does this match an
// already-saved search" without `page`/absent keys causing a false mismatch.
function normalizeFilters(params: InternshipFilterParams): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = params[key];
    if (value) normalized[key] = value;
  }
  return normalized;
}

function sameFilters(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

// Unlike useSavedInternships (pure localStorage, no account needed), a saved
// search is tied to the student's account server-side — this needs a token
// and real loading/error states a localStorage-backed hook never does.
export function useSavedSearches() {
  const { token, user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token || user?.role !== 'student') {
      setSavedSearches([]);
      return;
    }
    setLoading(true);
    apiFetch<PaginatedResult<SavedSearch>>('/saved-searches/me?pageSize=50', { token })
      .then((result) => setSavedSearches(result.items))
      .catch(() => setSavedSearches([]))
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const matchesSaved = useCallback(
    (params: InternshipFilterParams) => {
      const normalized = normalizeFilters(params);
      return savedSearches.find((s) => sameFilters(s.filters, normalized)) ?? null;
    },
    [savedSearches],
  );

  const saveCurrent = useCallback(
    async (params: InternshipFilterParams) => {
      if (!token) return;
      const filters = normalizeFilters(params);
      const created = await apiFetch<SavedSearch>('/saved-searches', {
        method: 'POST',
        token,
        body: { filters },
      });
      setSavedSearches((prev) => [created, ...prev]);
    },
    [token],
  );

  const remove = useCallback(
    async (id: number) => {
      if (!token) return;
      await apiFetch(`/saved-searches/${id}`, { method: 'DELETE', token });
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    },
    [token],
  );

  return { savedSearches, loading, matchesSaved, saveCurrent, remove };
}
