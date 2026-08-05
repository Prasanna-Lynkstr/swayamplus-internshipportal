'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { INTERNSHIP_CATEGORIES } from '@/lib/categories';

const PILL_FIELD =
  'rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-sp-navy placeholder:text-sp-ink-3 focus:outline-none focus:ring-2 focus:ring-sp-orange/40 focus:border-sp-orange/60';

const FILTER_KEYS = ['q', 'location', 'employmentType', 'category', 'mode'] as const;

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [employmentType, setEmploymentType] = useState(searchParams.get('employmentType') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [mode, setMode] = useState(searchParams.get('mode') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');

  const activeFilterCount = FILTER_KEYS.filter((key) => searchParams.get(key)).length;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    if (employmentType) params.set('employmentType', employmentType);
    if (category) params.set('category', category);
    if (mode) params.set('mode', mode);
    if (sort && sort !== 'newest') params.set('sort', sort);
    router.push(`/internships?${params.toString()}`);
  };

  return (
    <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
      {activeFilterCount > 0 ? (
        <Link
          href="/internships"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-sp-ink-2 hover:border-sp-orange/40"
        >
          Filters
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sp-orange text-xs text-white">
            {activeFilterCount}
          </span>
          <span className="text-sp-ink-3">· Clear all</span>
        </Link>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-sp-ink-3">
          Filters
        </span>
      )}

      <div className="w-36">
        <Select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
          className={PILL_FIELD}
        >
          <option value="">Any type</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
        </Select>
      </div>
      <div className="w-40">
        <Input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={PILL_FIELD}
        />
      </div>
      <div className="w-44">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className={PILL_FIELD}>
          <option value="">Any category</option>
          {INTERNSHIP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <Select value={mode} onChange={(e) => setMode(e.target.value)} className={PILL_FIELD}>
          <option value="">Any work mode</option>
          <option value="remote">Remote</option>
          <option value="onsite">Onsite</option>
          <option value="hybrid">Hybrid</option>
        </Select>
      </div>
      <div className="w-44">
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className={PILL_FIELD}>
          <option value="newest">Newest first</option>
          <option value="stipend_high">Highest stipend</option>
          <option value="deadline_soon">Deadline soon</option>
        </Select>
      </div>
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder="Search title, description, or skills"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={PILL_FIELD}
        />
      </div>
      <Button type="submit" className="!px-5 !py-2 text-sm">
        Apply
      </Button>
    </form>
  );
}
