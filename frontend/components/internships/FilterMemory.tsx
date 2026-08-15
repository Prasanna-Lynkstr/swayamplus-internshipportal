'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FILTER_KEYS } from '@/lib/internshipFilters';

const FILTER_STORAGE_KEY = 'sp_internship_filters';
// sessionStorage (per-tab, cleared per session) tells us whether we're
// *already* on this page — distinct from localStorage's cross-session
// memory of the filters themselves. That distinction is what lets a real
// "Clear all filters" click (same page, same session) win over a stale
// remembered filter set, while a fresh arrival from anywhere else restores it.
const LAST_PATH_KEY = 'sp_internships_last_pathname';

// The browse page is entirely URL-driven (see buildInternshipsHref) — simple,
// but it means landing on a bare /internships (nav link, a "Browse
// internships" button elsewhere, a new tab) always resets every filter, even
// for someone who had a specific search dialed in a minute ago.
//
// Every filter control here (category/mode chips, the search bar, sort) is a
// plain <Link>/router.push to a new /internships?... URL — it never remounts
// this component, it just changes the search params on the same page. So this
// has to react to useSearchParams() changing, not just run once on mount: an
// effect gated on `[]` would only ever see the *first* URL of the session and
// silently miss every filter picked afterwards.
export function FilterMemory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const cameFromThisPage = sessionStorage.getItem(LAST_PATH_KEY) === pathname;
    sessionStorage.setItem(LAST_PATH_KEY, pathname);

    const kept = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) kept.set(key, value);
    }
    const currentQuery = kept.toString();

    if (currentQuery) {
      localStorage.setItem(FILTER_STORAGE_KEY, currentQuery);
      return;
    }

    if (cameFromThisPage) {
      // Filters were just intentionally cleared on this same page — respect
      // it instead of immediately redirecting right back to the old state.
      localStorage.removeItem(FILTER_STORAGE_KEY);
      return;
    }

    const remembered = localStorage.getItem(FILTER_STORAGE_KEY);
    if (remembered) {
      router.replace(`${pathname}?${remembered}`);
    }
    // `search` (not `searchParams`, which gets a new object identity every
    // render) is the real gate — re-run exactly when the URL's query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pathname, router]);

  return null;
}
