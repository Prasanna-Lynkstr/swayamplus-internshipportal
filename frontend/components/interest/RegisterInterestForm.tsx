'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

// Day-1 lightweight capture, deliberately separate from full profile
// creation — no login, no OTP, just enough to follow up with someone who
// isn't ready to register yet.
export function RegisterInterestForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [areaOfInterest, setAreaOfInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/interest-registrations', {
        method: 'POST',
        body: {
          fullName,
          email,
          phone: phone || undefined,
          areaOfInterest: areaOfInterest || undefined,
        },
      });
      setSaved(true);
      setFullName('');
      setEmail('');
      setPhone('');
      setAreaOfInterest('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register your interest.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Card className="p-6 text-center">
        <p className="font-bold text-sp-navy">Thanks — we&apos;ve noted your interest!</p>
        <p className="mt-1 text-sm text-sp-ink-2">
          We&apos;ll reach out when there&apos;s a good match, and you can register fully anytime.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="mb-1 text-lg font-bold text-sp-navy">Not ready to register yet?</h3>
      <p className="mb-4 text-sm text-sp-ink-2">
        Leave your details and we&apos;ll let you know when there&apos;s an internship for you.
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="interestFullName">Full name</Label>
          <Input
            id="interestFullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="interestEmail">Email</Label>
          <Input
            id="interestEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="interestPhone">Phone (optional)</Label>
          <Input id="interestPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="interestArea">Area of interest (optional)</Label>
          <Input
            id="interestArea"
            value={areaOfInterest}
            onChange={(e) => setAreaOfInterest(e.target.value)}
            placeholder="Software Development, Marketing…"
          />
        </div>
        {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Register interest'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
