'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';

export function RequestInternshipForm({ variant = 'inline' }: { variant?: 'inline' | 'empty-state' }) {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(variant === 'empty-state');
  const [domain, setDomain] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const heading = "Can't find what you're looking for?";
  const body =
    variant === 'empty-state'
      ? "Tell us the domain or role you're after and we'll pass it on to employers we're onboarding."
      : "Let us know what you're looking for — it helps us bring in the right employers.";

  if (!user) {
    return (
      <div className="rounded-sp-lg border border-dashed border-black/10 bg-white p-5 text-center text-sm text-sp-ink-2">
        <p className="font-bold text-sp-navy">{heading}</p>
        <p className="mt-1">
          <Link href="/register/student" className="font-bold text-sp-blue">
            Log in as a student
          </Link>{' '}
          to request an internship domain we don&apos;t have yet.
        </p>
      </div>
    );
  }

  if (user.role !== 'student') {
    return null;
  }

  if (status === 'done') {
    return (
      <div className="rounded-sp-lg bg-sp-good-soft p-5 text-center text-sm font-semibold text-sp-good">
        Thanks — we&apos;ve logged your request and will keep an eye out.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await apiFetch('/internship-requests', {
        method: 'POST',
        token,
        body: { domain, notes: notes || undefined },
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Could not submit your request.');
    }
  };

  if (!open) {
    return (
      <div className="rounded-sp-lg border border-dashed border-black/10 bg-white p-5 text-center">
        <p className="mb-2 text-sm font-bold text-sp-navy">{heading}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-bold text-sp-blue hover:underline"
        >
          Request a domain →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-sp-lg border border-black/10 bg-white p-5">
      <p className="mb-1 font-bold text-sp-navy">{heading}</p>
      <p className="mb-4 text-sm text-sp-ink-2">{body}</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="request-domain">Domain / role you're looking for</Label>
          <Input
            id="request-domain"
            required
            placeholder="e.g. Data Science, UI/UX Design"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="request-notes">Anything else? (optional)</Label>
          <Textarea
            id="request-notes"
            rows={2}
            placeholder="Location preference, remote-only, timing…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Submit request'}
          </Button>
          {variant === 'inline' && (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
