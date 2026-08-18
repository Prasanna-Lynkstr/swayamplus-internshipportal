'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import type { ApplicationStatus, ChecklistAnswer, ChecklistItem, ChecklistResponseLevel } from '@/lib/types';

const STATUS_COPY: Record<ApplicationStatus, string> = {
  applied: "You've already applied to this internship.",
  shortlisted: "You've been shortlisted for this internship!",
  interviewing: "You're in the interview stage for this internship.",
  offered: "You've received an offer for this internship!",
  rejected: 'Your application to this internship was not selected.',
  withdrawn: 'You withdrew your application to this internship.',
};

const LEVELS: { value: ChecklistResponseLevel; label: string }[] = [
  { value: 'limited', label: 'Limited' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'expert', label: 'Expert' },
];

const ANSWERS: { value: ChecklistAnswer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

type ResponseValue = ChecklistResponseLevel | ChecklistAnswer | '';

interface ItemResponse {
  value: ResponseValue;
  note: string;
}

export function ApplyForm({
  internshipId,
  checklistItems = [],
  initialApplicationStatus = null,
}: {
  internshipId: string;
  checklistItems?: ChecklistItem[];
  initialApplicationStatus?: ApplicationStatus | null;
}) {
  const { user, token } = useAuth();
  const [coverNote, setCoverNote] = useState('');
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const setValue = (item: string, value: ResponseValue) => {
    setResponses((prev) => {
      const current = prev[item] ?? { value: '', note: '' };
      return { ...prev, [item]: { ...current, value } };
    });
  };

  const setNote = (item: string, note: string) => {
    setResponses((prev) => {
      const current = prev[item] ?? { value: '', note: '' };
      return { ...prev, [item]: { ...current, note } };
    });
  };

  if (!user) {
    return (
      <div className="rounded-sp-lg bg-sp-bg-sunken p-5 text-sm text-sp-ink-2">
        <Link href="/register/student" className="font-bold text-sp-blue">
          Log in as a student
        </Link>{' '}
        to apply to this internship.
      </div>
    );
  }

  if (user.role !== 'student') {
    return (
      <div className="rounded-sp-lg bg-sp-bg-sunken p-5 text-sm text-sp-ink-2">
        Only student accounts can apply to internships.
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="rounded-sp-lg bg-sp-good-soft p-5 text-sm font-semibold text-sp-good">
        Application submitted! Track its status from your{' '}
        <Link href="/applications" className="underline">
          applications
        </Link>
        .
      </div>
    );
  }

  if (initialApplicationStatus) {
    return (
      <div className="rounded-sp-lg bg-sp-bg-sunken p-5 text-sm text-sp-ink-2">
        <p className="font-semibold text-sp-navy">{STATUS_COPY[initialApplicationStatus]}</p>
        <Link href="/applications" className="mt-1 inline-block font-bold text-sp-blue">
          View your applications
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await apiFetch(`/internships/${internshipId}/apply`, {
        method: 'POST',
        token,
        body: {
          coverNote: coverNote || undefined,
          // Only send items the student actually answered — an unanswered
          // item is omitted rather than sent with a guessed value.
          checklistResponses: checklistItems
            .filter((c) => responses[c.item]?.value)
            .map((c) => ({
              item: c.item,
              type: c.type,
              value: responses[c.item].value,
              note: responses[c.item].note || undefined,
            })),
        },
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {checklistItems.length > 0 && (
        <div className="rounded-sp-lg bg-sp-bg-sunken p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-2">
            Before you apply, answer what the employer&apos;s looking for
          </p>
          <div className="flex flex-col gap-3">
            {checklistItems.map((c) => {
              const options = c.type === 'yesno' ? ANSWERS : LEVELS;
              return (
                <div key={c.item} className="rounded-sp-md bg-white p-3">
                  <p className="text-sm font-semibold text-sp-navy">{c.item}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {options.map((o) => {
                      const active = responses[c.item]?.value === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setValue(c.item, o.value)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? 'border-sp-blue bg-sp-blue text-white'
                              : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    className="mt-2"
                    placeholder="Add a note (optional) — e.g. built two projects using this"
                    value={responses[c.item]?.note ?? ''}
                    onChange={(e) => setNote(c.item, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Textarea
        placeholder="Add a short note about why you're a good fit (optional)"
        rows={4}
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
      />
      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
      <Button type="submit" disabled={status === 'submitting'} withArrow>
        {status === 'submitting' ? 'Submitting…' : 'Apply now'}
      </Button>
    </form>
  );
}
