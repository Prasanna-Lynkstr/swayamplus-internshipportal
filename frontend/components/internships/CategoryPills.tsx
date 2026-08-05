import Link from 'next/link';
import { categoryIcon, pastelForIndex } from '@/lib/categories';
import type { CategoryCount } from '@/lib/types';

interface Props {
  categories: CategoryCount[];
  activeCategory?: string;
  currentParams: Record<string, string | undefined>;
}

const PASTEL_BG: Record<string, string> = {
  yellow: 'bg-sp-pastel-yellow',
  peach: 'bg-sp-pastel-peach',
  lavender: 'bg-sp-pastel-lavender',
  mint: 'bg-sp-pastel-mint',
};

function hrefFor(currentParams: Record<string, string | undefined>, category?: string) {
  const params = new URLSearchParams();
  if (currentParams.q) params.set('q', currentParams.q);
  if (currentParams.location) params.set('location', currentParams.location);
  if (currentParams.mode) params.set('mode', currentParams.mode);
  if (currentParams.employmentType) params.set('employmentType', currentParams.employmentType);
  if (currentParams.sort) params.set('sort', currentParams.sort);
  if (category) params.set('category', category);
  const qs = params.toString();
  return `/internships${qs ? `?${qs}` : ''}`;
}

export function CategoryPills({ categories, activeCategory, currentParams }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((c, i) => {
        const isActive = activeCategory === c.category;
        return (
          <Link
            key={c.category}
            href={hrefFor(currentParams, isActive ? undefined : c.category)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-sp-navy/20 bg-white text-sp-navy shadow-sm'
                : `border-transparent ${PASTEL_BG[pastelForIndex(i)]} text-sp-ink-2 hover:brightness-95`
            }`}
          >
            <span>{categoryIcon(c.category)}</span>
            {c.category}
            <span className={isActive ? 'text-sp-ink-3' : 'text-sp-ink-2/60'}>({c.count})</span>
          </Link>
        );
      })}
    </div>
  );
}
