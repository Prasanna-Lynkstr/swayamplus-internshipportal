'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';

// A "What" + "Where" pair, not a single free-text box — `location` is a
// real, working filter server-side (see QueryInternshipsDto/findPublished)
// but had no UI control at all until this changed, so a search like "paid
// HR internships in Bangalore" had no way to actually filter by city; the
// role/skill box alone never matched a location.
export function SearchBar({ currentParams }: { currentParams: InternshipFilterParams }) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? '');
  const [location, setLocation] = useState(currentParams.location ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      buildInternshipsHref(currentParams, { q: q || undefined, location: location || undefined }),
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-1 rounded-sp-lg border border-black/10 bg-sp-bg-elev p-1.5 shadow-sm shadow-black/5 transition-shadow focus-within:border-sp-orange focus-within:shadow-[0_0_0_4px_var(--color-sp-orange-soft)] sm:flex-row sm:items-stretch sm:gap-0"
    >
      <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-sp-ink-3"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Role, skill, or company…"
          aria-label="Role, skill, or company"
          className="w-full bg-transparent text-[15px] text-sp-navy placeholder:text-sp-ink-3 focus:outline-none"
        />
      </div>

      <div className="hidden w-px shrink-0 bg-black/10 sm:block" />

      <div className="flex flex-1 items-center gap-2.5 border-t border-black/10 px-3 py-2 sm:border-t-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-sp-ink-3"
        >
          <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, e.g. Bengaluru"
          aria-label="Location"
          className="w-full bg-transparent text-[15px] text-sp-navy placeholder:text-sp-ink-3 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="m-1 shrink-0 rounded-full bg-sp-orange px-5 py-2 text-sm font-bold text-white hover:bg-[#e2620f]"
      >
        Search
      </button>
    </form>
  );
}
