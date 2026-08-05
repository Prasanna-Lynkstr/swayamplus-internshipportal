'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

export default function PostInternshipPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    domain: '',
    mode: 'remote',
    location: '',
    durationWeeks: 8,
    stipendMin: '',
    stipendMax: '',
    openings: 1,
    applicationDeadline: '',
    skillTags: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/internships', {
        method: 'POST',
        token,
        body: {
          title: form.title,
          description: form.description,
          domain: form.domain,
          mode: form.mode,
          location: form.location || undefined,
          durationWeeks: Number(form.durationWeeks),
          stipendMin: form.stipendMin ? Number(form.stipendMin) : undefined,
          stipendMax: form.stipendMax ? Number(form.stipendMax) : undefined,
          openings: Number(form.openings) || 1,
          applicationDeadline: new Date(form.applicationDeadline).toISOString(),
          skillTags: form.skillTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      router.push('/employer/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create the internship. Please check your details and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-sp-navy">Post an internship</h1>
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
              rows={5}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              required
              placeholder="IT/ITeS, BFSI, Design…"
              value={form.domain}
              onChange={(e) => set('domain', e.target.value)}
            />
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
            <Label htmlFor="stipendMin">Stipend min (₹/mo)</Label>
            <Input
              id="stipendMin"
              type="number"
              value={form.stipendMin}
              onChange={(e) => set('stipendMin', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="stipendMax">Stipend max (₹/mo)</Label>
            <Input
              id="stipendMax"
              type="number"
              value={form.stipendMax}
              onChange={(e) => set('stipendMax', e.target.value)}
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
              value={form.applicationDeadline}
              onChange={(e) => set('applicationDeadline', e.target.value)}
            />
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

          {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving} withArrow>
              {saving ? 'Creating…' : 'Create internship (as draft)'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
