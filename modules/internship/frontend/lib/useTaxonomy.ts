'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './api';

export interface TaxonomyOption {
  id: number;
  listKey: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

// listKey -> in-flight/loaded list, shared across every component instance so
// InternshipCard/InternshipForm/register pages etc. don't each fire their own
// GET /taxonomies/:listKey on mount. Taxonomy lists are admin-managed but
// change rarely, so a module-lifetime cache (no TTL/invalidation) is fine —
// a full page reload picks up admin edits.
const cache = new Map<string, TaxonomyOption[]>();
const inFlight = new Map<string, Promise<TaxonomyOption[]>>();

function fetchList(listKey: string): Promise<TaxonomyOption[]> {
  const cached = cache.get(listKey);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(listKey);
  if (pending) return pending;

  const request = apiFetch<TaxonomyOption[]>(`/taxonomies/${listKey}`)
    .then((values) => {
      cache.set(listKey, values);
      inFlight.delete(listKey);
      return values;
    })
    .catch((err) => {
      inFlight.delete(listKey);
      throw err;
    });
  inFlight.set(listKey, request);
  return request;
}

// Active, sorted values for one admin-managed taxonomy list — e.g.
// 'internship_category' | 'work_mode' | 'employment_type' | 'schedule_type' |
// 'paid_preference'. Replaces the old hardcoded option arrays/enums.
export function useTaxonomy(listKey: string): TaxonomyOption[] {
  const [options, setOptions] = useState<TaxonomyOption[]>(cache.get(listKey) ?? []);

  useEffect(() => {
    let cancelled = false;
    fetchList(listKey).then((values) => {
      if (!cancelled) setOptions(values);
    });
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  return options;
}
