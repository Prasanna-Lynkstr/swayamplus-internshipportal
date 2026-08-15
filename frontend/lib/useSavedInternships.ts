'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sp_saved_internships';

function readSaved(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

// Bookmarking has no backend model — this is a real, working feature scoped to
// the browser via localStorage rather than a fake button that does nothing.
export function useSavedInternships() {
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => setSaved(readSaved()), []);

  const isSaved = useCallback((id: number) => saved.includes(id), [saved]);

  const toggle = useCallback((id: number) => {
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
