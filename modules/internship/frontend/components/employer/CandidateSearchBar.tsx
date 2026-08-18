'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildCandidatesHref } from '@/lib/candidateFilters';
import type { CandidateFilterParams } from '@/lib/candidateFilters';

// Single free-text box (name, college, course, or skill) — location has its
// own field in CandidateFilterSidebar, unlike the student browse page's
// SearchBar which pairs a "what" box with a "where" box.
export function CandidateSearchBar({ currentParams }: { currentParams: CandidateFilterParams }) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildCandidatesHref(currentParams, { q: q || undefined }));
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1 rounded-sp-lg border border-black/10 bg-sp-bg-elev p-1.5 shadow-sm shadow-black/5 transition-shadow focus-within:border-sp-orange focus-within:shadow-[0_0_0_4px_var(--color-sp-orange-soft)]"
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
          placeholder="Name, college, course, or skill…"
          aria-label="Search candidates"
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
