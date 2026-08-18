'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { useSavedInternships } from '@/lib/useSavedInternships';
import type { Internship } from '@/lib/types';

// Bookmarking (ShareSaveActions/useSavedInternships) has always been a real,
// working feature — it just had no page to view the result. Bookmarked ids
// live in localStorage, not a backend model, so this fetches each one by id
// client-side rather than a paginated server-rendered list.
export default function BookmarkedInternshipsPage() {
  const { saved, toggle } = useSavedInternships();
  const [items, setItems] = useState<Internship[] | null>(null);
  // useSavedInternships reads localStorage in an effect (empty on the very
  // first render, even in the browser) — wait for that before treating an
  // empty `saved` array as "nothing bookmarked" instead of "not loaded yet".
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (saved.length === 0) {
      setItems([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      saved.map((id) =>
        apiFetch<Internship>(`/internships/${id}`).catch((err) => {
          // No longer visible (closed, archived, or deleted) — drop the dead
          // bookmark instead of leaving a permanently broken entry behind.
          if (err instanceof ApiError && err.status === 404) toggle(id);
          return null;
        }),
      ),
    ).then((results) => {
      if (!cancelled) setItems(results.filter((r): r is Internship => r !== null));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toggle is a stable useCallback; depending on it would re-run this fetch every time a bookmark is added/removed elsewhere
  }, [hydrated, saved]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/internships/browse"
          className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-sp-blue hover:underline"
        >
          ← Back to internships
        </Link>
        <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Bookmarked
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
          Your bookmarked internships
        </h1>
        <p className="mt-1 text-sm text-sp-ink-2">
          Bookmarked on this device — tap the star on any listing to bookmark or remove it.
        </p>
      </div>

      {!hydrated || items === null ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="text-3xl">☆</span>
          <p className="font-bold text-sp-navy">No bookmarked internships yet.</p>
          <p className="text-sm text-sp-ink-3">
            Tap the star on any listing while browsing to bookmark it here for later.
          </p>
          <Link href="/internships/browse">
            <Button withArrow>Browse internships</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((internship) => (
            <InternshipCard key={internship.id} internship={internship} />
          ))}
        </div>
      )}
    </div>
  );
}
