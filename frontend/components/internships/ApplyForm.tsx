'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

export function ApplyForm({ internshipId }: { internshipId: number }) {
  const { user, token } = useAuth();
  const [coverNote, setCoverNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

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
        <Link href="/internships" className="underline">
          applications
        </Link>
        .
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
        body: { coverNote: coverNote || undefined },
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
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
