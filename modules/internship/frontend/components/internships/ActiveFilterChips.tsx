import Link from 'next/link';
import { buildInternshipsHref, parseMultiValue, serializeMultiValue } from '@/lib/internshipFilters';
import type { FilterKey, InternshipFilterParams } from '@/lib/internshipFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

interface Props {
  currentParams: InternshipFilterParams;
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
}

interface Chip {
  id: string;
  label: string;
  href: string;
}

// One removable chip per selected *value*, not per filter group — Category/
// Work mode/Type/Education level/Stream are all multi-select (see
// FilterSidebar.tsx) and store their selection as one comma-joined param, so
// removing "Remote" from Work mode must drop just that value, not the whole
// `mode` filter if e.g. "Hybrid" is still selected too.
function multiChips(
  key: FilterKey,
  currentParams: InternshipFilterParams,
  labelFor: (value: string) => string,
): Chip[] {
  const values = parseMultiValue(currentParams[key]);
  return values.map((value) => ({
    id: `${key}:${value}`,
    label: labelFor(value),
    href: buildInternshipsHref(currentParams, {
      [key]: serializeMultiValue(values.filter((v) => v !== value)),
    }),
  }));
}

// Sort is a view option, not a filter — it never appears here, only the
// params that actually narrow the result set do.
export function ActiveFilterChips({ currentParams, modes, employmentTypes }: Props) {
  const chips: Chip[] = [];

  if (currentParams.q) {
    chips.push({
      id: 'q',
      label: `"${currentParams.q}"`,
      href: buildInternshipsHref(currentParams, { q: undefined }),
    });
  }
  if (currentParams.location) {
    chips.push({
      id: 'location',
      label: currentParams.location,
      href: buildInternshipsHref(currentParams, { location: undefined }),
    });
  }
  chips.push(...multiChips('category', currentParams, (v) => v));
  chips.push(...multiChips('mode', currentParams, (v) => modes.find((m) => m.value === v)?.label ?? v));
  chips.push(
    ...multiChips('employmentType', currentParams, (v) => employmentTypes.find((t) => t.value === v)?.label ?? v),
  );
  chips.push(...multiChips('educationLevel', currentParams, (v) => v));
  chips.push(...multiChips('stream', currentParams, (v) => v));
  if (currentParams.experienceRequired === 'false') {
    chips.push({
      id: 'experienceRequired',
      label: 'Freshers welcome',
      href: buildInternshipsHref(currentParams, { experienceRequired: undefined }),
    });
  }
  if (currentParams.paid === 'true') {
    chips.push({ id: 'paid', label: 'Paid only', href: buildInternshipsHref(currentParams, { paid: undefined }) });
  }
  if (currentParams.stipendMin) {
    chips.push({
      id: 'stipendMin',
      label: `₹${Number(currentParams.stipendMin).toLocaleString('en-IN')}+/mo`,
      href: buildInternshipsHref(currentParams, { stipendMin: undefined }),
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
