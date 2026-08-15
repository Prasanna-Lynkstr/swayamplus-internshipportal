'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

// The 5 content taxonomies made admin-manageable in Phase 0 — see
// docs/V1_RELEASE_SPEC.md §14. Deliberately NOT extended to workflow-state
// enums (role, verification/internship/application status) — those still
// live in code, see the doc for why.
const LISTS: Array<{ key: string; title: string; hint: string }> = [
  {
    key: 'internship_category',
    title: 'Internship categories',
    hint: 'Drives the browse-page category chips and the post-internship form.',
  },
  { key: 'work_mode', title: 'Work modes', hint: 'e.g. Remote, Onsite, Hybrid.' },
  { key: 'employment_type', title: 'Employment types', hint: 'e.g. Full-time, Part-time.' },
  { key: 'schedule_type', title: 'Schedule types', hint: 'e.g. Flexible, Fixed.' },
  { key: 'paid_preference', title: 'Paid preferences', hint: "Students' paid/unpaid preference options." },
];

function TaxonomyListEditor({ listKey, token }: { listKey: string; token: string | null }) {
  const [values, setValues] = useState<TaxonomyOption[] | null>(null);
  const [error, setError] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    if (!token) return;
    apiFetch<TaxonomyOption[]>(`/admin/taxonomies/${listKey}`, { token })
      .then(setValues)
      .catch(() => setError('Could not load this list.'));
  };

  useEffect(load, [listKey, token]);

  const addValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || !newLabel.trim()) return;
    setAdding(true);
    setError('');
    try {
      await apiFetch(`/admin/taxonomies/${listKey}`, {
        method: 'POST',
        token,
        body: { value: newValue.trim(), label: newLabel.trim() },
      });
      setNewValue('');
      setNewLabel('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this value.');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (option: TaxonomyOption) => {
    setError('');
    try {
      await apiFetch(`/admin/taxonomies/${listKey}/${option.id}`, {
        method: 'PATCH',
        token,
        body: { isActive: !option.isActive },
      });
      load();
    } catch {
      setError('Could not update this value.');
    }
  };

  const renameLabel = async (option: TaxonomyOption) => {
    const label = window.prompt('New label', option.label);
    if (!label || label === option.label) return;
    setError('');
    try {
      await apiFetch(`/admin/taxonomies/${listKey}/${option.id}`, {
        method: 'PATCH',
        token,
        body: { label },
      });
      load();
    } catch {
      setError('Could not rename this value.');
    }
  };

  if (!values) return <p className="text-sm text-sp-ink-3">Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
      <div className="flex flex-col divide-y divide-black/5">
        {values.map((option) => (
          <div key={option.id} className="flex items-center justify-between gap-3 py-2">
            <div className={option.isActive ? '' : 'opacity-50'}>
              <p className="text-sm font-semibold text-sp-navy">{option.label}</p>
              <p className="text-xs text-sp-ink-3">
                value: <code>{option.value}</code>
                {!option.isActive && ' · retired'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => renameLabel(option)}>
                Rename
              </Button>
              <Button variant={option.isActive ? 'secondary' : 'primary'} onClick={() => toggleActive(option)}>
                {option.isActive ? 'Retire' : 'Restore'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addValue} className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-3">
        <div className="w-48">
          <Input
            placeholder="Machine value (e.g. contract)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Input
            placeholder="Display label (e.g. Contract)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={adding}>
          {adding ? 'Adding…' : 'Add value'}
        </Button>
      </form>
    </div>
  );
}

export default function AdminTaxonomiesPage() {
  const { token } = useAuth();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Manage the fixed dropdown lists used across the platform — add a new value or retire an
          old one without a code deploy. Retiring a value keeps existing records that reference it
          intact; it just stops appearing as a choice going forward.
        </p>
      </div>

      <AdminTabs />

      <div className="flex flex-col gap-6">
        {LISTS.map((list) => (
          <Card key={list.key} className="p-6">
            <h2 className="text-lg font-bold text-sp-navy">{list.title}</h2>
            <p className="mb-4 text-sm text-sp-ink-2">{list.hint}</p>
            <TaxonomyListEditor listKey={list.key} token={token} />
          </Card>
        ))}
      </div>
    </div>
  );
}
