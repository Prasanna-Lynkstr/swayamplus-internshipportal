'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import type { ApplicationNote } from '@/lib/types';

// Shared by the applicant review modal and (previously) the dashboard's
// inline row — pulled into its own file so there's exactly one fetch/post
// implementation instead of two copies drifting apart.
export function ApplicantNotes({ applicationId, token }: { applicationId: number; token: string | null }) {
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    apiFetch<ApplicationNote[]>(`/applications/${applicationId}/notes`, { token })
      .then(setNotes)
      .finally(() => setLoading(false));
  };

  useEffect(load, [applicationId, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/applications/${applicationId}/notes`, {
        method: 'POST',
        token,
        body: { note: draft.trim() },
      });
      setDraft('');
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p className="text-xs text-sp-ink-3">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-sp-ink-3">No notes yet — add one after you speak with them.</p>
      ) : (
        <ul className="mb-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-sp-sm bg-white p-2 text-xs text-sp-ink-2 shadow-sm shadow-black/5">
              <span className="font-semibold text-sp-navy">{n.author?.identifier ?? 'Unknown'}</span>{' '}
              <span className="text-sp-ink-3">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
              <p className="mt-0.5">{n.note}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this applicant…"
          className="flex-1 rounded-sp-md border border-black/10 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sp-blue"
        />
        <Button type="submit" variant="secondary" disabled={saving || !draft.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}
