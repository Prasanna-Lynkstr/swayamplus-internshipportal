import Link from 'next/link';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { FilterKey, InternshipFilterParams } from '@/lib/internshipFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

interface Props {
  currentParams: InternshipFilterParams;
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
}

// Sort is a view option, not a filter — it never appears here, only the
// params that actually narrow the result set do.
export function ActiveFilterChips({ currentParams, modes, employmentTypes }: Props) {
  const chips: { key: FilterKey; label: string }[] = [];

  if (currentParams.q) chips.push({ key: 'q', label: `"${currentParams.q}"` });
  if (currentParams.location) chips.push({ key: 'location', label: currentParams.location });
  if (currentParams.category) chips.push({ key: 'category', label: currentParams.category });
  if (currentParams.mode) {
    chips.push({
      key: 'mode',
      label: modes.find((m) => m.value === currentParams.mode)?.label ?? currentParams.mode,
    });
  }
  if (currentParams.employmentType) {
    chips.push({
      key: 'employmentType',
      label:
        employmentTypes.find((t) => t.value === currentParams.employmentType)?.label ??
        currentParams.employmentType,
    });
  }
  if (currentParams.educationLevel) chips.push({ key: 'educationLevel', label: currentParams.educationLevel });
  if (currentParams.stream) chips.push({ key: 'stream', label: currentParams.stream });
  if (currentParams.experienceRequired === 'false') {
    chips.push({ key: 'experienceRequired', label: 'Freshers welcome' });
  }
  if (currentParams.paid === 'true') chips.push({ key: 'paid', label: 'Paid only' });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildInternshipsHref(currentParams, { [chip.key]: undefined })}
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
