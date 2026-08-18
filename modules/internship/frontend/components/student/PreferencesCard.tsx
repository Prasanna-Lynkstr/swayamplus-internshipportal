'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useTaxonomy } from '@/lib/useTaxonomy';
import type { StudentPreferences } from '@/lib/types';

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const MAX_AVAILABLE_FROM_DAYS = 60;

function dateInputValue(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function PreferencesCard({
  token,
  onSaved,
}: {
  token: string | null;
  /** Called after a successful save — lets a wizard-style caller auto-advance. */
  onSaved?: () => void;
}) {
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  const [locationsText, setLocationsText] = useState('');
  const [rolesText, setRolesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const categories = useTaxonomy('internship_category');
  const modes = useTaxonomy('work_mode');
  const employmentTypes = useTaxonomy('employment_type');
  const paidPreferences = useTaxonomy('paid_preference');

  useEffect(() => {
    if (!token) return;
    apiFetch<StudentPreferences>('/students/me/preferences', { token }).then((p) => {
      setPrefs(p);
      setLocationsText(p.preferredLocations.join(', '));
      setRolesText(p.rolesOfInterest.join(', '));
    });
  }, [token]);

  if (!prefs) return <p className="text-sm text-sp-ink-3">Loading preferences…</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiFetch<StudentPreferences>('/students/me/preferences', {
        method: 'PATCH',
        token,
        body: {
          preferredCategories: prefs.preferredCategories,
          preferredModes: prefs.preferredModes,
          preferredEmploymentTypes: prefs.preferredEmploymentTypes,
          paidPreference: prefs.paidPreference,
          availabilityStatus: prefs.availabilityStatus || undefined,
          availableFrom:
            prefs.availabilityStatus === 'available_from'
              ? prefs.availableFrom || undefined
              : undefined,
          preferredLocations: locationsText.split(',').map((s) => s.trim()).filter(Boolean),
          rolesOfInterest: rolesText.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      setPrefs(updated);
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Internship types you're interested in</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = prefs.preferredCategories.includes(category.value);
            return (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  setPrefs(
                    (p) =>
                      p && {
                        ...p,
                        preferredCategories: toggleInArray(p.preferredCategories, category.value),
                      },
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Work mode</Label>
        <div className="flex flex-wrap gap-2">
          {modes.map((mode) => {
            const active = prefs.preferredModes.includes(mode.value);
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() =>
                  setPrefs((p) => p && { ...p, preferredModes: toggleInArray(p.preferredModes, mode.value) })
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Full-time / part-time</Label>
        <div className="flex flex-wrap gap-2">
          {employmentTypes.map((type) => {
            const active = prefs.preferredEmploymentTypes.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() =>
                  setPrefs(
                    (p) =>
                      p && {
                        ...p,
                        preferredEmploymentTypes: toggleInArray(p.preferredEmploymentTypes, type.value),
                      },
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="paidPreference">Paid / unpaid</Label>
        <select
          id="paidPreference"
          value={prefs.paidPreference}
          onChange={(e) => setPrefs((p) => p && { ...p, paidPreference: e.target.value })}
          className="w-full rounded-sp-lg border border-black/10 px-3 py-2 text-sm text-sp-navy outline-none focus:border-sp-blue"
        >
          {paidPreferences.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="availabilityStatus">Availability</Label>
        <select
          id="availabilityStatus"
          value={prefs.availabilityStatus ?? ''}
          onChange={(e) =>
            setPrefs(
              (p) =>
                p && {
                  ...p,
                  availabilityStatus: (e.target.value || null) as StudentPreferences['availabilityStatus'],
                },
            )
          }
          className="w-full rounded-sp-lg border border-black/10 px-3 py-2 text-sm text-sp-navy outline-none focus:border-sp-blue"
        >
          <option value="">Not set</option>
          <option value="actively_looking">Actively looking</option>
          <option value="not_looking">Not looking</option>
          <option value="available_from">Available from a specific date</option>
        </select>
        {prefs.availabilityStatus === 'available_from' && (
          <input
            type="date"
            className="mt-2 w-full rounded-sp-lg border border-black/10 px-3 py-2 text-sm text-sp-navy outline-none focus:border-sp-blue"
            min={dateInputValue(0)}
            max={dateInputValue(MAX_AVAILABLE_FROM_DAYS)}
            value={prefs.availableFrom ?? ''}
            onChange={(e) => setPrefs((p) => p && { ...p, availableFrom: e.target.value })}
          />
        )}
      </div>
      <div>
        <Label htmlFor="preferredLocations">Preferred locations (comma-separated)</Label>
        <Input
          id="preferredLocations"
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
          placeholder="Bengaluru, Remote"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="rolesOfInterest">Roles of interest (comma-separated)</Label>
        <Input
          id="rolesOfInterest"
          value={rolesText}
          onChange={(e) => setRolesText(e.target.value)}
          placeholder="Backend Developer, Growth Marketing Intern"
        />
      </div>

      {saved && <p className="sm:col-span-2 text-sm font-semibold text-sp-good">Preferences saved!</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </form>
  );
}
