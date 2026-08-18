'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryIcon } from '@/lib/categories';
import { buildInternshipsHref, parseMultiValue, serializeMultiValue } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';
import type { TaxonomyOption } from '@/lib/useTaxonomy';
import type { CategoryCount } from '@/lib/types';
import { Button } from '@/components/ui/Button';

// Code-level enums, not admin-managed taxonomies — same lists as
// components/employer/InternshipForm.tsx. 'Any' is deliberately excluded:
// it's a real stored value a posting can be tagged with, but not something a
// student ever explicitly filters *by* (see query-internships.dto.ts).
const EDUCATION_LEVELS = ['UG', 'PG', 'Other'] as const;
const STREAMS = ['Engineering', 'Management', 'Arts', 'Commerce', 'Science', 'Law', 'Medical', 'Other'] as const;

// A single "at least ₹X/month" floor, not a two-handle range — nobody
// filters out a *higher*-paying internship. Presets over a slider since
// there's no slider primitive anywhere in this codebase, and these five
// values cover the real decision a student is making well enough.
const STIPEND_PRESETS = [
  { label: '₹2,000+', value: '2000' },
  { label: '₹5,000+', value: '5000' },
  { label: '₹10,000+', value: '10000' },
  { label: '₹15,000+', value: '15000' },
] as const;

// Past this many items, a filter group's own list starts pushing every
// *other* filter group below the fold — the actual bug this caps. Splitting
// into visible/overflow keeps every section's header reachable without
// scrolling, while the overflow itself is one click away, not lost.
const MAX_VISIBLE_ITEMS = 6;

function splitOverflow<T>(items: T[], isSelected: (item: T) => boolean) {
  if (items.length <= MAX_VISIBLE_ITEMS) {
    return { visible: items, hidden: [] as T[], hiddenHasSelected: false };
  }
  const visible = items.slice(0, MAX_VISIBLE_ITEMS);
  const hidden = items.slice(MAX_VISIBLE_ITEMS);
  return { visible, hidden, hiddenHasSelected: hidden.some(isSelected) };
}

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

interface Props {
  categories: CategoryCount[];
  modes: TaxonomyOption[];
  employmentTypes: TaxonomyOption[];
  currentParams: InternshipFilterParams;
}

// A checkbox-shaped toggle button, not a Link — every control in this
// sidebar stages its selection locally and only reaches the URL (and thus
// triggers a refetch) via the "Apply filters" button at the bottom, and
// multiple values within one group can be checked at once.
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

function CategoryRow({
  category,
  count,
  checked,
  onClick,
}: {
  category: string;
  count: number;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`flex items-center gap-2 rounded-sp-sm px-2 py-1.5 text-left text-sm font-semibold transition-colors ${
        checked ? 'bg-sp-orange-soft text-sp-orange-ink' : 'text-sp-ink-2 hover:bg-sp-bg-sunken'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
          checked ? 'border-sp-orange bg-sp-orange text-white' : 'border-black/20 bg-white'
        }`}
      >
        {checked && '✓'}
      </span>
      <span className="w-4 shrink-0 text-center text-[15px]">{categoryIcon(category)}</span>
      <span className="min-w-0 flex-1 truncate">{category}</span>
      <span className={`font-mono text-[11px] ${checked ? 'text-sp-orange-ink/70' : 'text-sp-ink-3'}`}>{count}</span>
    </button>
  );
}

// Zero-JS-feeling "+N more" reveal (still a real <details>, just now
// React-controlled — see the FilterSidebar comment on why it can't stay
// driven by a plain `open={condition}` once this panel re-renders on every
// checkbox click instead of navigating).
function MoreToggle({
  count,
  open,
  onToggle,
  children,
}: {
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details className="group" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="cursor-pointer list-none rounded-sp-sm px-2 py-1.5 text-xs font-bold text-sp-blue [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">+{count} more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      {children}
    </details>
  );
}

function ChipMoreToggle({
  count,
  open,
  onToggle,
  children,
}: {
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details className="group open:basis-full" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-dashed border-sp-blue/40 px-3 py-1.5 text-xs font-bold text-sp-blue [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">+{count} more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </details>
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

export function FilterSidebar({ categories, modes, employmentTypes, currentParams }: Props) {
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState(() => new Set(parseMultiValue(currentParams.category)));
  const [selectedModes, setSelectedModes] = useState(() => new Set(parseMultiValue(currentParams.mode)));
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(parseMultiValue(currentParams.employmentType)));
  const [selectedEducation, setSelectedEducation] = useState(() =>
    new Set(parseMultiValue(currentParams.educationLevel)),
  );
  const [selectedStreams, setSelectedStreams] = useState(() => new Set(parseMultiValue(currentParams.stream)));
  const [paidOnly, setPaidOnly] = useState(currentParams.paid === 'true');
  const [freshersOnly, setFreshersOnly] = useState(currentParams.experienceRequired === 'false');
  const [stipendMin, setStipendMin] = useState(currentParams.stipendMin ?? '');
  const [categoryMoreOpen, setCategoryMoreOpen] = useState(false);
  const [streamMoreOpen, setStreamMoreOpen] = useState(false);

  // Resync every staged control from the URL whenever it changes from
  // *outside* this panel's own Apply button — Clear all, an
  // ActiveFilterChips removal, FilterMemory's restore, or plain browser
  // back/forward all update `currentParams` without this component ever
  // unmounting (it's the same route, just new search params as props).
  useEffect(() => {
    setSelectedCategories(new Set(parseMultiValue(currentParams.category)));
    setSelectedModes(new Set(parseMultiValue(currentParams.mode)));
    setSelectedTypes(new Set(parseMultiValue(currentParams.employmentType)));
    setSelectedEducation(new Set(parseMultiValue(currentParams.educationLevel)));
    setSelectedStreams(new Set(parseMultiValue(currentParams.stream)));
    setPaidOnly(currentParams.paid === 'true');
    setFreshersOnly(currentParams.experienceRequired === 'false');
    setStipendMin(currentParams.stipendMin ?? '');
    // Only the actual filter values should re-trigger this — `currentParams`
    // itself is a fresh object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentParams.category,
    currentParams.mode,
    currentParams.employmentType,
    currentParams.educationLevel,
    currentParams.stream,
    currentParams.paid,
    currentParams.experienceRequired,
    currentParams.stipendMin,
  ]);

  const categorySplit = splitOverflow(categories, (c) => selectedCategories.has(c.category));
  const streamSplit = splitOverflow([...STREAMS], (s) => selectedStreams.has(s));

  // Auto-open a "+more" section the instant a staged selection is hiding
  // inside it — otherwise a checkbox the user just ticked in the overflow
  // could silently vanish behind "+N more" again on the next render.
  useEffect(() => {
    if (categorySplit.hiddenHasSelected) setCategoryMoreOpen(true);
  }, [categorySplit.hiddenHasSelected]);
  useEffect(() => {
    if (streamSplit.hiddenHasSelected) setStreamMoreOpen(true);
  }, [streamSplit.hiddenHasSelected]);

  const isDirty =
    !sameMembers(selectedCategories, new Set(parseMultiValue(currentParams.category))) ||
    !sameMembers(selectedModes, new Set(parseMultiValue(currentParams.mode))) ||
    !sameMembers(selectedTypes, new Set(parseMultiValue(currentParams.employmentType))) ||
    !sameMembers(selectedEducation, new Set(parseMultiValue(currentParams.educationLevel))) ||
    !sameMembers(selectedStreams, new Set(parseMultiValue(currentParams.stream))) ||
    paidOnly !== (currentParams.paid === 'true') ||
    freshersOnly !== (currentParams.experienceRequired === 'false') ||
    stipendMin !== (currentParams.stipendMin ?? '');

  const stagedCount =
    selectedCategories.size +
    selectedModes.size +
    selectedTypes.size +
    selectedEducation.size +
    selectedStreams.size +
    (paidOnly ? 1 : 0) +
    (freshersOnly ? 1 : 0) +
    (stipendMin ? 1 : 0);

  const hasAppliedFilter =
    [
      currentParams.category,
      currentParams.mode,
      currentParams.employmentType,
      currentParams.educationLevel,
      currentParams.stream,
      currentParams.experienceRequired,
      currentParams.location,
      currentParams.paid,
      currentParams.stipendMin,
    ].filter(Boolean).length > 0;

  const applyFilters = () => {
    router.push(
      buildInternshipsHref(currentParams, {
        category: serializeMultiValue([...selectedCategories]),
        mode: serializeMultiValue([...selectedModes]),
        employmentType: serializeMultiValue([...selectedTypes]),
        educationLevel: serializeMultiValue([...selectedEducation]),
        stream: serializeMultiValue([...selectedStreams]),
        paid: paidOnly ? 'true' : undefined,
        experienceRequired: freshersOnly ? 'false' : undefined,
        stipendMin: stipendMin || undefined,
      }),
    );
  };

  return (
    <aside className="rounded-sp-lg border border-black/5 bg-sp-bg-elev shadow-sm shadow-black/5">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3.5">
        <h2 className="text-sm font-extrabold text-sp-navy">Filters</h2>
        {hasAppliedFilter && (
          <button type="button" onClick={() => router.push('/internships/browse')} className="text-xs font-bold text-sp-blue">
            Clear all
          </button>
        )}
      </div>

      <div className="flex max-h-[calc(100vh-160px)] flex-col gap-1 overflow-y-auto px-2 py-2 lg:max-h-[calc(100vh-220px)]">
        <details className="border-b border-black/5 px-2 py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Category
          </summary>
          <div className="mt-2 flex flex-col gap-0.5">
            {categorySplit.visible.map((c) => (
              <CategoryRow
                key={c.category}
                category={c.category}
                count={c.count}
                checked={selectedCategories.has(c.category)}
                onClick={() => setSelectedCategories((prev) => toggleMember(prev, c.category))}
              />
            ))}
            {categorySplit.hidden.length > 0 && (
              <MoreToggle count={categorySplit.hidden.length} open={categoryMoreOpen} onToggle={setCategoryMoreOpen}>
                <div className="flex flex-col gap-0.5">
                  {categorySplit.hidden.map((c) => (
                    <CategoryRow
                      key={c.category}
                      category={c.category}
                      count={c.count}
                      checked={selectedCategories.has(c.category)}
                      onClick={() => setSelectedCategories((prev) => toggleMember(prev, c.category))}
                    />
                  ))}
                </div>
              </MoreToggle>
            )}
          </div>
        </details>

        {modes.length > 0 && (
          <details className="border-b border-black/5 px-2 py-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
              Work mode
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
              Type
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

        <details className="border-b border-black/5 px-2 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Education level
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {EDUCATION_LEVELS.map((level) => (
              <CheckboxChip
                key={level}
                label={level}
                checked={selectedEducation.has(level)}
                onClick={() => setSelectedEducation((prev) => toggleMember(prev, level))}
              />
            ))}
          </div>
        </details>

        <details className="border-b border-black/5 px-2 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Stream
          </summary>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {streamSplit.visible.map((s) => (
              <CheckboxChip
                key={s}
                label={s}
                checked={selectedStreams.has(s)}
                onClick={() => setSelectedStreams((prev) => toggleMember(prev, s))}
              />
            ))}
            {streamSplit.hidden.length > 0 && (
              <ChipMoreToggle count={streamSplit.hidden.length} open={streamMoreOpen} onToggle={setStreamMoreOpen}>
                {streamSplit.hidden.map((s) => (
                  <CheckboxChip
                    key={s}
                    label={s}
                    checked={selectedStreams.has(s)}
                    onClick={() => setSelectedStreams((prev) => toggleMember(prev, s))}
                  />
                ))}
              </ChipMoreToggle>
            )}
          </div>
        </details>

        <details className="border-b border-black/5 px-2 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold uppercase tracking-wide text-sp-ink-2 [&::-webkit-details-marker]:hidden">
            Minimum stipend
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <CheckboxChip label="Any" checked={stipendMin === ''} onClick={() => setStipendMin('')} />
            {STIPEND_PRESETS.map((preset) => (
              <CheckboxChip
                key={preset.value}
                label={preset.label}
                checked={stipendMin === preset.value}
                onClick={() => setStipendMin(preset.value)}
              />
            ))}
          </div>
        </details>

        <div className="flex flex-col gap-1 px-3 py-3">
          <Switch label="Paid only" on={paidOnly} onClick={() => setPaidOnly((v) => !v)} />
          <Switch label="Freshers welcome" on={freshersOnly} onClick={() => setFreshersOnly((v) => !v)} />
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
