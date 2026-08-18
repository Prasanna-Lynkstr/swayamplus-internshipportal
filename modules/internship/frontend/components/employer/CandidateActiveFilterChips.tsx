import Link from 'next/link';
import { parseMultiValue, serializeMultiValue } from '@/lib/internshipFilters';
import { buildCandidatesHref } from '@/lib/candidateFilters';
import type { CandidateFilterKey, CandidateFilterParams } from '@/lib/candidateFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

interface Props {
  currentParams: CandidateFilterParams;
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
}

interface Chip {
  id: string;
  label: string;
  href: string;
}

function multiChips(
  key: CandidateFilterKey,
  currentParams: CandidateFilterParams,
  labelFor: (value: string) => string,
): Chip[] {
  const values = parseMultiValue(currentParams[key]);
  return values.map((value) => ({
    id: `${key}:${value}`,
    label: labelFor(value),
    href: buildCandidatesHref(currentParams, {
      [key]: serializeMultiValue(values.filter((v) => v !== value)),
    }),
  }));
}

// Mirrors ActiveFilterChips.tsx — not worth generalizing since the filter
// vocabulary differs (skills/name search, no stipend/paid concept here).
export function CandidateActiveFilterChips({ currentParams, modes, employmentTypes }: Props) {
  const chips: Chip[] = [];

  if (currentParams.q) {
    chips.push({ id: 'q', label: `"${currentParams.q}"`, href: buildCandidatesHref(currentParams, { q: undefined }) });
  }
  if (currentParams.location) {
    chips.push({
      id: 'location',
      label: currentParams.location,
      href: buildCandidatesHref(currentParams, { location: undefined }),
    });
  }
  chips.push(...multiChips('category', currentParams, (v) => v));
  chips.push(...multiChips('mode', currentParams, (v) => modes.find((m) => m.value === v)?.label ?? v));
  chips.push(
    ...multiChips('employmentType', currentParams, (v) => employmentTypes.find((t) => t.value === v)?.label ?? v),
  );
  if (currentParams.activeOnly === 'true') {
    chips.push({
      id: 'activeOnly',
      label: 'Active in last 7 days',
      href: buildCandidatesHref(currentParams, { activeOnly: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={chip.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-sp-navy py-1.5 pl-3 pr-1.5 text-xs font-bold text-white hover:bg-sp-navy/90"
        >
          {chip.label}
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] leading-none">
            &times;
          </span>
        </Link>
      ))}
    </div>
  );
}
