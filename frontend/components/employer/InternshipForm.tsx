'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { INTERNSHIP_CATEGORIES } from '@/lib/categories';
import type { Internship } from '@/lib/types';

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
}

export const EMPTY_INTERNSHIP_FORM: InternshipFormValues = {
  title: '',
  description: '',
  category: INTERNSHIP_CATEGORIES[0] as string,
  mode: 'remote',
  employmentType: 'full-time',
  location: '',
  durationWeeks: 8,
  workingDays: 5,
  scheduleType: 'flexible',
  stipendMin: '',
  stipendMax: '',
  openings: 1,
  applicationDeadline: '',
  skillTags: '',
  responsibilities: '',
  perks: '',
  eligibility: '',
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
  };
}

export function InternshipForm({
  initial,
  submitLabel,
  savingLabel,
  fallbackError,
  onSubmit,
}: {
  initial?: InternshipFormValues;
  submitLabel: string;
  savingLabel: string;
  fallbackError: string;
  onSubmit: (body: ReturnType<typeof internshipFormToBody>) => Promise<void>;
}) {
  const [form, setForm] = useState<InternshipFormValues>(initial ?? EMPTY_INTERNSHIP_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof InternshipFormValues>(key: K, value: InternshipFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(internshipFormToBody(form));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallbackError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
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
            {INTERNSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="mode">Work mode</Label>
          <Select id="mode" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="remote">Remote</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="employmentType">Type</Label>
          <Select
            id="employmentType"
            value={form.employmentType}
            onChange={(e) => set('employmentType', e.target.value)}
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="durationWeeks">Duration (weeks)</Label>
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
            <option value="flexible">Flexible</option>
            <option value="fixed">Fixed</option>
          </Select>
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
          <Label htmlFor="applicationDeadline">Application deadline</Label>
          <Input
            id="applicationDeadline"
            type="date"
            required
            max={maxDeadlineDate()}
            value={form.applicationDeadline}
            onChange={(e) => set('applicationDeadline', e.target.value)}
          />
          <p className="mt-1 text-xs text-sp-ink-3">
            Up to {MAX_DEADLINE_DAYS_OUT} days from today.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="skillTags">Skill tags (comma-separated)</Label>
          <Input
            id="skillTags"
            value={form.skillTags}
            onChange={(e) => set('skillTags', e.target.value)}
            placeholder="React, Node.js"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="eligibility">Eligibility (comma-separated)</Label>
          <Input
            id="eligibility"
            value={form.eligibility}
            onChange={(e) => set('eligibility', e.target.value)}
            placeholder="Undergraduate, Postgraduate, Engineering Students"
          />
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

        {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} withArrow>
            {saving ? savingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
