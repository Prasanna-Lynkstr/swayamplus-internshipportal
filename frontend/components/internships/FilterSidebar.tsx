import Link from 'next/link';
import { categoryIcon } from '@/lib/categories';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';
import type { CategoryCount } from '@/lib/types';

// Code-level enums, not admin-managed taxonomies — same lists as
// components/employer/InternshipForm.tsx. 'Any' is deliberately excluded:
// it's a real stored value a posting can be tagged with, but not something a
// student ever explicitly filters *by* (see query-internships.dto.ts).
const EDUCATION_LEVELS = ['UG', 'PG', 'Other'] as const;
const STREAMS = ['Engineering', 'Management', 'Arts', 'Commerce', 'Science', 'Law', 'Medical', 'Other'] as const;

interface Props {
  categories: CategoryCount[];
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
  currentParams: InternshipFilterParams;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? 'border-sp-navy bg-sp-navy text-white'
          : 'border-black/10 bg-sp-bg-elev text-sp-ink-2 hover:border-sp-orange/50'
      }`}
    >
      {children}
    </Link>
  );
}

function Switch({ href, on, label }: { href: string; on: boolean; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm font-semibold text-sp-ink-2">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-sp-good' : 'bg-black/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </Link>
  );
}

export function FilterSidebar({ categories, modes, employmentTypes, currentParams }: Props) {
  const activeCategory = currentParams.category;
  const activeMode = currentParams.mode;
  const activeType = currentParams.employmentType;
  const activeEducation = currentParams.educationLevel;
  const activeStream = currentParams.stream;
  const freshersOnly = currentParams.experienceRequired === 'false';
  const paidOnly = currentParams.paid === 'true';

  const activeFilterCount = [
    currentParams.category,
    currentParams.mode,
    currentParams.employmentType,
    currentParams.educationLevel,
    currentParams.stream,
    currentParams.experienceRequired,
    currentParams.location,
    currentParams.paid,
  ].filter(Boolean).length;

  return (
    <aside className="rounded-sp-lg border border-black/5 bg-sp-bg-elev shadow-sm shadow-black/5 lg:sticky lg:top-6">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3.5">
        <h2 className="text-sm font-extrabold text-sp-navy">Filters</h2>
        {activeFilterCount > 0 && (
          <Link href="/internships" className="text-xs font-bold text-sp-blue">
            Clear all
          </Link>
        )}
      </div>

      <div className="flex max-h-[calc(100vh-160px)] flex-col gap-1 overflow-y-auto px-2 py-2 lg:max-h-[calc(100vh-220px)]">
        <details className="border-b border-black/5 px-2 py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Category
          </summary>
          <div className="mt-2 flex flex-col gap-0.5">
            {categories.map((c) => {
              const isActive = activeCategory === c.category;
              return (
                <Link
                  key={c.category}
                  href={buildInternshipsHref(currentParams, { category: isActive ? undefined : c.category })}
                  className={`flex items-center gap-2 rounded-sp-sm px-2 py-1.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-sp-orange-soft text-sp-orange-ink' : 'text-sp-ink-2 hover:bg-sp-bg-sunken'
                  }`}
                >
                  <span className="w-4 shrink-0 text-center text-[15px]">{categoryIcon(c.category)}</span>
                  <span className="min-w-0 flex-1 truncate">{c.category}</span>
                  <span className={`font-mono text-[11px] ${isActive ? 'text-sp-orange-ink/70' : 'text-sp-ink-3'}`}>
                    {c.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </details>

        {modes.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Work mode
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <Chip
                  key={m.value}
                  href={buildInternshipsHref(currentParams, { mode: activeMode === m.value ? undefined : m.value })}
                  active={activeMode === m.value}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
          </details>
        )}

        {employmentTypes.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Type
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {employmentTypes.map((t) => (
                <Chip
                  key={t.value}
                  href={buildInternshipsHref(currentParams, {
                    employmentType: activeType === t.value ? undefined : t.value,
                  })}
                  active={activeType === t.value}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </details>
        )}

        <details className="border-b border-black/5 px-2 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Education level
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {EDUCATION_LEVELS.map((level) => (
              <Chip
                key={level}
                href={buildInternshipsHref(currentParams, {
                  educationLevel: activeEducation === level ? undefined : level,
                })}
                active={activeEducation === level}
              >
                {level}
              </Chip>
            ))}
          </div>
        </details>

        <details className="border-b border-black/5 px-2 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Stream
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {STREAMS.map((s) => (
              <Chip
                key={s}
                href={buildInternshipsHref(currentParams, { stream: activeStream === s ? undefined : s })}
                active={activeStream === s}
              >
                {s}
              </Chip>
            ))}
          </div>
        </details>

        <div className="flex flex-col gap-1 px-3 py-3">
          <Switch
            href={buildInternshipsHref(currentParams, { paid: paidOnly ? undefined : 'true' })}
            on={paidOnly}
            label="Paid only"
          />
          <Switch
            href={buildInternshipsHref(currentParams, { experienceRequired: freshersOnly ? undefined : 'false' })}
            on={freshersOnly}
            label="Freshers welcome"
          />
        </div>
      </div>
    </aside>
  );
}
