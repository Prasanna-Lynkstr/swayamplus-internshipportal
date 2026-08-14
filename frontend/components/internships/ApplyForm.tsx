'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type { ApplicationStatus } from '@/lib/types';

const STATUS_COPY: Record<ApplicationStatus, string> = {
  applied: "You've already applied to this internship.",
  shortlisted: "You've been shortlisted for this internship!",
  interviewing: "You're in the interview stage for this internship.",
  offered: "You've received an offer for this internship!",
  rejected: 'Your application to this internship was not selected.',
  withdrawn: 'You withdrew your application to this internship.',
};

export function ApplyForm({
  internshipId,
  checklistItems = [],
  initialApplicationStatus = null,
}: {
  internshipId: number;
  checklistItems?: string[];
  initialApplicationStatus?: ApplicationStatus | null;
}) {
  const { user, token } = useAuth();
  const [coverNote, setCoverNote] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const toggleChecklistItem = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
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
          checklistResponses: checklistItems.map((item) => ({
            item,
            met: checked.has(item),
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
            Before you apply, check what applies to you
          </p>
          <div className="flex flex-col gap-1.5">
            {checklistItems.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm text-sp-ink-2">
                <input
                  type="checkbox"
                  checked={checked.has(item)}
                  onChange={() => toggleChecklistItem(item)}
                />
                {item}
              </label>
            ))}
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
