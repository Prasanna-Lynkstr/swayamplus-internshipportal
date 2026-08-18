'use client';

import { useRouter } from 'next/navigation';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'relevance', label: 'Best match' },
  { value: 'stipend_high', label: 'Highest stipend' },
  { value: 'deadline_soon', label: 'Deadline soon' },
];

export function SortSelect({ currentParams }: { currentParams: InternshipFilterParams }) {
  const router = useRouter();
  const value = currentParams.sort ?? 'newest';

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) =>
          router.push(buildInternshipsHref(currentParams, { sort: e.target.value === 'newest' ? undefined : e.target.value }))
        }
        className="appearance-none rounded-full border border-black/10 bg-sp-bg-elev py-2 pl-4 pr-8 text-xs font-bold text-sp-ink-2 shadow-sm shadow-black/5 focus:outline-none focus:ring-2 focus:ring-sp-orange/40"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="pointer-events-none absolute right-3 text-sp-ink-3"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
