'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { useTaxonomy } from '@/lib/useTaxonomy';
import type { ChecklistItem, EducationLevel, Internship, Stream } from '@/lib/types';

// Code-level enums, not admin-managed taxonomies — see internship.model.ts
// on the backend for why these two stay hardcoded. 'Any' listed first so it
// doubles as the honest default the auto-fill effect below picks — an
// explicit "no preference" rather than an arbitrary specific value an
// employer never consciously chose.
const EDUCATION_LEVELS: EducationLevel[] = ['Any', 'UG', 'PG', 'Other'];
const STREAMS: Stream[] = [
  'Any',
  'Engineering',
  'Management',
  'Arts',
  'Commerce',
  'Science',
  'Law',
  'Medical',
  'Other',
];

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  Any: 'Any degree',
  UG: 'UG',
  PG: 'PG',
  Other: 'Other',
};

const STREAM_LABELS: Record<Stream, string> = {
  Any: 'Any stream',
  Engineering: 'Engineering',
  Management: 'Management',
  Arts: 'Arts',
  Commerce: 'Commerce',
  Science: 'Science',
  Law: 'Law',
  Medical: 'Medical',
  Other: 'Other',
};

// Kept in sync with the backend's MaxDaysFromNow(90) check on
// applicationDeadline (create-internship.dto.ts) — this just gives
// immediate feedback via the date picker's own min/max instead of a
// round trip to hit the same rule server-side.
const MAX_DEADLINE_DAYS_OUT = 90;

function maxDeadlineDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DEADLINE_DAYS_OUT);
  return d.toISOString().slice(0, 10);
}

const splitLines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

const splitCommas = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function stipendPreview(min: string, max: string): string {
  if (!min && !max) return 'Unpaid';
  if (min && max && min !== max) return `₹${min}–₹${max} / month`;
  return `₹${min || max} / month`;
}

const WIZARD_LABELS = ['Basics', 'Schedule & pay', 'Requirements', 'Checklist', 'Review'];

// Edit mode shows every field on one screen (no step-gating), but still
// benefits from the same grouping the create wizard uses one step at a
// time — otherwise it reads as one undifferentiated block of ~20 fields.
function SectionHeading({ children }: { children: string }) {
  return (
    <div className="sm:col-span-2 mt-2 border-t border-black/5 pt-4 first:mt-0 first:border-0 first:pt-0">
      <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{children}</p>
    </div>
  );
}

export interface InternshipFormValues {
  title: string;
  description: string;
  category: string;
  mode: string;
  employmentType: string;
  location: string;
  durationWeeks: number;
  workingDays: number;
  scheduleType: string;
  stipendMin: string;
  stipendMax: string;
  openings: number;
  applicationDeadline: string;
  skillTags: string;
  responsibilities: string;
  perks: string;
  eligibility: string;
  educationLevel: EducationLevel | '';
  stream: Stream | '';
  experienceRequired: boolean;
  checklistItems: ChecklistItem[];
}

// category/mode/employmentType/scheduleType start empty and get filled in
// from the fetched taxonomy defaults (see the effect in InternshipForm) —
// there's no safe hardcoded default now that these are admin-managed.
export const EMPTY_INTERNSHIP_FORM: InternshipFormValues = {
  title: '',
  description: '',
  category: '',
  mode: '',
  employmentType: '',
  location: '',
  durationWeeks: 8,
  workingDays: 5,
  scheduleType: '',
  stipendMin: '',
  stipendMax: '',
  openings: 1,
  applicationDeadline: '',
  skillTags: '',
  responsibilities: '',
  perks: '',
  eligibility: '',
  educationLevel: '',
  stream: '',
  experienceRequired: false,
  checklistItems: [],
};

export function internshipToFormValues(internship: Internship): InternshipFormValues {
  return {
    title: internship.title,
    description: internship.description,
    category: internship.category,
    mode: internship.mode,
    employmentType: internship.employmentType,
    location: internship.location ?? '',
    durationWeeks: internship.durationWeeks,
    workingDays: internship.workingDays,
    scheduleType: internship.scheduleType,
    stipendMin: internship.stipendMin?.toString() ?? '',
    stipendMax: internship.stipendMax?.toString() ?? '',
    openings: internship.openings,
    // applicationDeadline comes back as a full ISO timestamp; the <input
    // type="date"> field only accepts the date portion.
    applicationDeadline: internship.applicationDeadline.slice(0, 10),
    skillTags: internship.skillTags.join(', '),
    responsibilities: internship.responsibilities.join('\n'),
    perks: internship.perks.join(', '),
    eligibility: internship.eligibility.join(', '),
    educationLevel: internship.educationLevel ?? '',
    stream: internship.stream ?? '',
    experienceRequired: internship.experienceRequired,
    checklistItems: internship.checklistItems,
  };
}

export function internshipFormToBody(form: InternshipFormValues) {
  return {
    title: form.title,
    description: form.description,
    category: form.category,
    mode: form.mode,
    employmentType: form.employmentType,
    location: form.location || undefined,
    durationWeeks: Number(form.durationWeeks),
    workingDays: Number(form.workingDays) || 5,
    scheduleType: form.scheduleType,
    stipendMin: form.stipendMin ? Number(form.stipendMin) : undefined,
    stipendMax: form.stipendMax ? Number(form.stipendMax) : undefined,
    openings: Number(form.openings) || 1,
    applicationDeadline: new Date(form.applicationDeadline).toISOString(),
    skillTags: splitCommas(form.skillTags),
    responsibilities: splitLines(form.responsibilities),
    perks: splitCommas(form.perks),
    eligibility: splitCommas(form.eligibility),
    educationLevel: form.educationLevel,
    stream: form.stream,
    experienceRequired: form.experienceRequired,
    checklistItems: form.checklistItems
      .map((c) => ({ item: c.item.trim(), type: c.type }))
      .filter((c) => c.item.length > 0),
  };
}

export function InternshipForm({
  initial,
  submitLabel,
  savingLabel,
  fallbackError,
  onSubmit,
  onStepChange,
}: {
  initial?: InternshipFormValues;
  submitLabel: string;
  savingLabel: string;
  fallbackError: string;
  onSubmit: (body: ReturnType<typeof internshipFormToBody>) => Promise<void>;
  /** Fired whenever the create-mode wizard step changes — lets the page keep
   * its own progress bar in sync. Unused when editing an existing posting. */
  onStepChange?: (step: number) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<InternshipFormValues>(initial ?? EMPTY_INTERNSHIP_FORM);
  const [error, setError] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const categories = useTaxonomy('internship_category');
  const modes = useTaxonomy('work_mode');
  const employmentTypes = useTaxonomy('employment_type');
  const scheduleTypes = useTaxonomy('schedule_type');

  // Editing an existing posting shows every field on one screen (you're
  // fixing one thing, not being walked through creating it from scratch) —
  // only a brand-new posting gets the step-by-step wizard treatment.
  const isWizard = !initial;
  const showStep = (s: number) => !isWizard || step === s;

  // Only a fresh "post" form (no `initial`) needs a default filled in once
  // the taxonomy loads — an edit form already has real values from the
  // internship being edited.
  useEffect(() => {
    if (initial) return;
    setForm((f) => ({
      ...f,
      category: f.category || categories[0]?.value || f.category,
      mode: f.mode || modes[0]?.value || f.mode,
      employmentType: f.employmentType || employmentTypes[0]?.value || f.employmentType,
      scheduleType: f.scheduleType || scheduleTypes[0]?.value || f.scheduleType,
      educationLevel: f.educationLevel || EDUCATION_LEVELS[0],
      stream: f.stream || STREAMS[0],
    }));
  }, [initial, categories, modes, employmentTypes, scheduleTypes]);

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStepChange is a caller-provided callback, not reactive state to depend on
  }, [step]);

  const set = <K extends keyof InternshipFormValues>(key: K, value: InternshipFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const goToStep = (target: number) => {
    // Only validates fields currently mounted (the visible step's) — every
    // required field here is a real, visible native input/textarea/date, so
    // reportValidity alone is enough (unlike the employer EOI form, nothing
    // on this form is a chip-toggle group or hidden file input that skips
    // native constraint validation).
    if (formRef.current && !formRef.current.reportValidity()) return;
    setError([]);
    setStep(target);
  };

  const generateChecklist = async () => {
    setGenerating(true);
    setError([]);
    try {
      const { items } = await apiFetch<{ items: string[] }>('/internships/checklist/generate', {
        method: 'POST',
        token,
        body: { description: form.description },
      });
      // The generator only produces item text — every generated item starts
      // as a 'rating' question; the employer re-types any that are really a
      // plain yes/no confirmation (e.g. "Can you work 6 days a week?").
      set(
        'checklistItems',
        items.map((item) => ({ item, type: 'rating' as const })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : ['Could not generate a checklist.']);
    } finally {
      setGenerating(false);
    }
  };

  const addChecklistItem = () =>
    setForm((f) => ({ ...f, checklistItems: [...f.checklistItems, { item: '', type: 'rating' }] }));

  const updateChecklistItem = (index: number, patch: Partial<ChecklistItem>) =>
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const removeChecklistItem = (index: number) =>
    setForm((f) => ({ ...f, checklistItems: f.checklistItems.filter((_, i) => i !== index) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError([]);
    try {
      await onSubmit(internshipFormToBody(form));
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : [fallbackError]);
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = categories.find((c) => c.value === form.category)?.label ?? form.category;
  const modeLabel = modes.find((m) => m.value === form.mode)?.label ?? form.mode;
  const employmentTypeLabel =
    employmentTypes.find((t) => t.value === form.employmentType)?.label ?? form.employmentType;
  const ratedCount = form.checklistItems.filter((c) => c.type === 'rating').length;
  const yesNoCount = form.checklistItems.filter((c) => c.type === 'yesno').length;

  return (
    <Card className="p-6">
      {isWizard && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          {WIZARD_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                    step === i
                      ? 'bg-sp-orange text-white'
                      : step > i
                        ? 'bg-sp-good-soft text-sp-good-ink'
                        : 'bg-sp-bg-sunken text-sp-ink-3'
                  }`}
                >
                  {step > i ? '✓' : i + 1}
                </span>
                <span className={`text-xs font-bold ${step >= i ? 'text-sp-navy' : 'text-sp-ink-3'}`}>
                  {label}
                </span>
              </div>
              {i < WIZARD_LABELS.length - 1 && <span className="h-px w-4 shrink-0 bg-black/10 sm:w-6" />}
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showStep(0) && (
          <>
            {!isWizard && <SectionHeading>Basics</SectionHeading>}
            <div className="sm:col-span-2">
              <Label htmlFor="title" required>
                Title
              </Label>
              <Input id="title" required value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description" required>
                Description
              </Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="mode">Work mode</Label>
              <Select id="mode" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
                {modes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="employmentType">Type</Label>
              <Select
                id="employmentType"
                value={form.employmentType}
                onChange={(e) => set('employmentType', e.target.value)}
              >
                {employmentTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="applicationDeadline" required>
                Application deadline
              </Label>
              <Input
                id="applicationDeadline"
                type="date"
                required
                max={maxDeadlineDate()}
                value={form.applicationDeadline}
                onChange={(e) => set('applicationDeadline', e.target.value)}
              />
              <p className="mt-1 text-xs text-sp-ink-3">Up to {MAX_DEADLINE_DAYS_OUT} days from today.</p>
            </div>
          </>
        )}

        {isWizard && step === 0 && (
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" onClick={() => goToStep(1)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {showStep(1) && (
          <>
            {!isWizard && <SectionHeading>Schedule &amp; pay</SectionHeading>}
            <div>
              <Label htmlFor="durationWeeks" required>
                Duration (weeks)
              </Label>
              <Input
                id="durationWeeks"
                type="number"
                min={1}
                required
                value={form.durationWeeks}
                onChange={(e) => set('durationWeeks', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="workingDays">Working days / week</Label>
              <Input
                id="workingDays"
                type="number"
                min={1}
                max={7}
                value={form.workingDays}
                onChange={(e) => set('workingDays', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="scheduleType">Work hours</Label>
              <Select
                id="scheduleType"
                value={form.scheduleType}
                onChange={(e) => set('scheduleType', e.target.value)}
              >
                {scheduleTypes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="openings">Openings</Label>
              <Input
                id="openings"
                type="number"
                min={1}
                value={form.openings}
                onChange={(e) => set('openings', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="stipendMin">Stipend min (₹/mo)</Label>
              <Input
                id="stipendMin"
                type="number"
                value={form.stipendMin}
                onChange={(e) => set('stipendMin', e.target.value)}
                placeholder="Leave blank if unpaid"
              />
            </div>
            <div>
              <Label htmlFor="stipendMax">Stipend max (₹/mo)</Label>
              <Input
                id="stipendMax"
                type="number"
                value={form.stipendMax}
                onChange={(e) => set('stipendMax', e.target.value)}
                placeholder="Leave blank if unpaid"
              />
            </div>
          </>
        )}

        {isWizard && step === 1 && (
          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(0)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(2)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {showStep(2) && (
          <>
            {!isWizard && <SectionHeading>Requirements</SectionHeading>}
            <div className="sm:col-span-2">
              <Label htmlFor="skillTags" required>
                Skill tags (comma-separated)
              </Label>
              <Input
                id="skillTags"
                required
                value={form.skillTags}
                onChange={(e) => set('skillTags', e.target.value)}
                placeholder="React, Node.js"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="eligibility">Additional eligibility notes (comma-separated)</Label>
              <Input
                id="eligibility"
                value={form.eligibility}
                onChange={(e) => set('eligibility', e.target.value)}
                placeholder="Must be based in Chennai, Prior Figma experience preferred"
              />
              <p className="mt-1 text-xs text-sp-ink-3">
                Use this for anything the Education level / Stream dropdowns below don&apos;t
                cover — specific certifications, language requirements, etc.
              </p>
            </div>
            <div>
              <Label htmlFor="educationLevel">Education level</Label>
              <Select
                id="educationLevel"
                value={form.educationLevel}
                onChange={(e) => set('educationLevel', e.target.value as EducationLevel)}
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {EDUCATION_LEVEL_LABELS[level]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="stream">Stream</Label>
              <Select id="stream" value={form.stream} onChange={(e) => set('stream', e.target.value as Stream)}>
                {STREAMS.map((stream) => (
                  <option key={stream} value={stream}>
                    {STREAM_LABELS[stream]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="experienceRequired" className="flex items-center gap-2 text-sm font-bold text-sp-navy">
                <input
                  id="experienceRequired"
                  type="checkbox"
                  checked={form.experienceRequired}
                  onChange={(e) => set('experienceRequired', e.target.checked)}
                />
                Prior experience required (unchecked = freshers welcome)
              </label>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
              <Textarea
                id="responsibilities"
                rows={3}
                value={form.responsibilities}
                onChange={(e) => set('responsibilities', e.target.value)}
                placeholder={'Build and ship features\nWrite tests\nReview pull requests'}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="perks">Perks (comma-separated)</Label>
              <Input
                id="perks"
                value={form.perks}
                onChange={(e) => set('perks', e.target.value)}
                placeholder="Certificate of completion, Letter of recommendation, Job offer"
              />
            </div>
          </>
        )}

        {isWizard && step === 2 && (
          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(3)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {showStep(3) && (
          <div className="sm:col-span-2">
            {!isWizard && <SectionHeading>Checklist</SectionHeading>}
            <div className="mb-1 flex items-center justify-between">
              <Label>Applicant checklist</Label>
              <Button
                type="button"
                variant="secondary"
                // Stubbed off for now — re-enable by restoring the original disabled condition.
                disabled
                onClick={generateChecklist}
              >
                Generate from description
              </Button>
            </div>
            <p className="mb-2 text-xs text-sp-ink-3">
              Shown to students before they apply. Mark each item as a self-rating question (student
              picks Limited/Moderate/Expert) or a plain yes/no confirmation (e.g. &ldquo;Can you work
              6 days a week?&rdquo;).
            </p>
            <div className="flex flex-col gap-2">
              {form.checklistItems.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c.item}
                    onChange={(e) => updateChecklistItem(i, { item: e.target.value })}
                    placeholder="e.g. Comfortable with React"
                    className="flex-1"
                  />
                  <div className="flex shrink-0 overflow-hidden rounded-sp-md border border-black/10">
                    {(['rating', 'yesno'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateChecklistItem(i, { type: t })}
                        className={`px-3 py-2 text-xs font-bold transition-colors ${
                          c.type === t ? 'bg-sp-navy text-white' : 'bg-white text-sp-ink-2 hover:bg-black/5'
                        }`}
                      >
                        {t === 'rating' ? 'Rating' : 'Yes/No'}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-sp-danger hover:bg-sp-danger-soft"
                    onClick={() => removeChecklistItem(i)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" className="mt-2" onClick={addChecklistItem}>
              + Add item
            </Button>
          </div>
        )}

        {isWizard && step === 3 && (
          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(2)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(4)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {isWizard && step === 4 && (
          <div className="sm:col-span-2 flex flex-col gap-4 rounded-sp-lg bg-sp-bg-sunken p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
              Review before you publish
            </p>
            <div>
              <h3 className="text-lg font-extrabold text-sp-navy">{form.title || 'Untitled posting'}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categoryLabel && <Badge tone="orange">{categoryLabel}</Badge>}
                {modeLabel && <Badge tone="neutral">{modeLabel}</Badge>}
                {employmentTypeLabel && <Badge tone="neutral">{employmentTypeLabel}</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Duration</p>
                <p className="mt-0.5 text-sm font-semibold text-sp-navy">{form.durationWeeks} weeks</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Stipend</p>
                <p className="mt-0.5 text-sm font-semibold text-sp-navy">
                  {stipendPreview(form.stipendMin, form.stipendMax)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Openings</p>
                <p className="mt-0.5 text-sm font-semibold text-sp-navy">{form.openings}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Apply by</p>
                <p className="mt-0.5 text-sm font-semibold text-sp-navy">
                  {form.applicationDeadline
                    ? new Date(form.applicationDeadline).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>
            {form.skillTags && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {splitCommas(form.skillTags).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-sp-ink-2">
              {form.checklistItems.length === 0
                ? 'No applicant checklist added.'
                : `Applicant checklist: ${ratedCount} rating question${ratedCount === 1 ? '' : 's'}, ${yesNoCount} yes/no question${yesNoCount === 1 ? '' : 's'}.`}
            </p>
          </div>
        )}

        {error.length > 0 && (
          <div className="sm:col-span-2">
            <FormError messages={error} />
          </div>
        )}

        {(!isWizard || step === 4) && (
          <div className="sm:col-span-2 flex items-center justify-between">
            {isWizard && (
              <Button type="button" variant="ghost" onClick={() => goToStep(3)}>
                ← Back
              </Button>
            )}
            <Button type="submit" disabled={saving} withArrow className="ml-auto">
              {saving ? savingLabel : submitLabel}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
