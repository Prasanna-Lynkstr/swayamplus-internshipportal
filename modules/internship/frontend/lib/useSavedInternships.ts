'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sp_saved_internships';

function readSaved(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

// Bookmarking has no backend model — this is a real, working feature scoped to
// the browser via localStorage rather than a fake button that does nothing.
// Older saved lists may still contain pre-UUID numeric ids — those just won't
// match anything after the internship-id migration and drop out silently
// (see /internships/bookmarked's per-id fetch, which already tolerates a
// failed lookup), no special-casing needed here.
export function useSavedInternships() {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => setSaved(readSaved()), []);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Exposes the raw id list too — /internships/bookmarked needs to know *which*
  // ids to fetch, not just answer isSaved(id) for one at a time.
  return { saved, isSaved, toggle };
}
