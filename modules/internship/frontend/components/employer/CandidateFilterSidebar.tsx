'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseMultiValue, serializeMultiValue } from '@/lib/internshipFilters';
import { buildCandidatesHref } from '@/lib/candidateFilters';
import type { CandidateFilterParams } from '@/lib/candidateFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';
import { Button } from '@/components/ui/Button';

function toggleMember(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function sameMembers(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// Same "checkbox-shaped toggle button" idiom as the student browse page's
// FilterSidebar — staged locally, only reaches the URL via Apply.
function CheckboxChip({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        checked
          ? 'border-sp-navy bg-sp-navy text-white'
          : 'border-black/10 bg-sp-bg-elev text-sp-ink-2 hover:border-sp-orange/50'
      }`}
    >
      {label}
    </button>
  );
}

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 py-1">
      <span className="text-sm font-semibold text-sp-ink-2">{label}</span>
      <span
        aria-hidden="true"
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
    </button>
  );
}

interface Props {
  categories: TaxonomyOption[];
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
  currentParams: CandidateFilterParams;
}

export function CandidateFilterSidebar({ categories, modes, employmentTypes, currentParams }: Props) {
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState(() => new Set(parseMultiValue(currentParams.category)));
  const [selectedModes, setSelectedModes] = useState(() => new Set(parseMultiValue(currentParams.mode)));
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(parseMultiValue(currentParams.employmentType)));
  const [location, setLocation] = useState(currentParams.location ?? '');
  const [activeOnly, setActiveOnly] = useState(currentParams.activeOnly === 'true');

  // Resync from the URL whenever it changes from outside this panel (Clear
  // all, a chip removal, browser back/forward) — same reasoning as the
  // student browse page's FilterSidebar.
  useEffect(() => {
    setSelectedCategories(new Set(parseMultiValue(currentParams.category)));
    setSelectedModes(new Set(parseMultiValue(currentParams.mode)));
    setSelectedTypes(new Set(parseMultiValue(currentParams.employmentType)));
    setLocation(currentParams.location ?? '');
    setActiveOnly(currentParams.activeOnly === 'true');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParams.category, currentParams.mode, currentParams.employmentType, currentParams.location, currentParams.activeOnly]);

  const isDirty =
    !sameMembers(selectedCategories, new Set(parseMultiValue(currentParams.category))) ||
    !sameMembers(selectedModes, new Set(parseMultiValue(currentParams.mode))) ||
    !sameMembers(selectedTypes, new Set(parseMultiValue(currentParams.employmentType))) ||
    location !== (currentParams.location ?? '') ||
    activeOnly !== (currentParams.activeOnly === 'true');

  const stagedCount =
    selectedCategories.size + selectedModes.size + selectedTypes.size + (location ? 1 : 0) + (activeOnly ? 1 : 0);

  const hasAppliedFilter =
    [
      currentParams.category,
      currentParams.mode,
      currentParams.employmentType,
      currentParams.location,
      currentParams.activeOnly,
      currentParams.q,
    ].filter(Boolean).length > 0;

  const applyFilters = () => {
    router.push(
      buildCandidatesHref(currentParams, {
        category: serializeMultiValue([...selectedCategories]),
        mode: serializeMultiValue([...selectedModes]),
        employmentType: serializeMultiValue([...selectedTypes]),
        location: location || undefined,
        activeOnly: activeOnly ? 'true' : undefined,
      }),
    );
  };

  return (
    <aside className="rounded-sp-lg border border-black/5 bg-sp-bg-elev shadow-sm shadow-black/5">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3.5">
        <h2 className="text-sm font-extrabold text-sp-navy">Filters</h2>
        {hasAppliedFilter && (
          <button type="button" onClick={() => router.push('/employer/candidates')} className="text-xs font-bold text-sp-blue">
            Clear all
          </button>
        )}
      </div>

      <div className="flex max-h-[calc(100vh-160px)] flex-col gap-1 overflow-y-auto px-2 py-2 lg:max-h-[calc(100vh-220px)]">
        {categories.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Interested in
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <CheckboxChip
                  key={c.value}
                  label={c.label}
                  checked={selectedCategories.has(c.value)}
                  onClick={() => setSelectedCategories((prev) => toggleMember(prev, c.value))}
                />
              ))}
            </div>
          </details>
        )}

        {modes.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Preferred work mode
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <CheckboxChip
                  key={m.value}
                  label={m.label}
                  checked={selectedModes.has(m.value)}
                  onClick={() => setSelectedModes((prev) => toggleMember(prev, m.value))}
                />
              ))}
            </div>
          </details>
        )}

        {employmentTypes.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Preferred type
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {employmentTypes.map((t) => (
                <CheckboxChip
                  key={t.value}
                  label={t.label}
                  checked={selectedTypes.has(t.value)}
                  onClick={() => setSelectedTypes((prev) => toggleMember(prev, t.value))}
                />
              ))}
            </div>
          </details>
        )}

        <details className="border-b border-black/5 px-2 py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            City
          </summary>
          <div className="mt-2.5">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="w-full rounded-sp-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-sp-blue"
            />
          </div>
        </details>

        <div className="px-3 py-3">
          <Switch label="Active in the last 7 days" on={activeOnly} onClick={() => setActiveOnly((v) => !v)} />
        </div>
      </div>

      <div className="border-t border-black/5 px-4 py-3">
        <Button type="button" onClick={applyFilters} disabled={!isDirty} className="w-full">
          Apply filters{stagedCount > 0 ? ` (${stagedCount})` : ''}
        </Button>
      </div>
    </aside>
  );
}
