'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import type { Student } from '@/lib/types';

const GRADUATION_YEAR_SPAN = 5;

function graduationYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: GRADUATION_YEAR_SPAN * 2 + 1 },
    (_, i) => currentYear - GRADUATION_YEAR_SPAN + i,
  );
}

// Self-contained (fetches its own /students/me) so it can be reused both at
// initial profile completion (register/student) and for later edits
// (student/dashboard) without either caller having to thread profile state
// through — same pattern PreferencesCard already used before this refactor.
export function ProfileFieldsCard({
  token,
  onSaved,
}: {
  token: string | null;
  /** Called after a successful save — lets a wizard-style caller auto-advance. */
  onSaved?: () => void;
}) {
  const [profile, setProfile] = useState<Partial<Student>>({});
  const [skillsText, setSkillsText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<Student>('/students/me', { token }).then((s) => {
      setProfile(s);
      setSkillsText((s.skills ?? []).join(', '));
      setLoaded(true);
    });
  }, [token]);

  if (!loaded) return <p className="text-sm text-sp-ink-3">Loading profile…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required fields also carry a native `required`/`pattern` attribute
    // (see the inputs below) so the browser catches most of this before we
    // even get here — this is the one check that can't be expressed that
    // way, since "not blank" doesn't mean "has a real skill after splitting
    // on commas" (e.g. a value of just ",").
    const skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) {
      setError('Add at least one skill.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await apiFetch<Student>('/students/me', {
        method: 'PATCH',
        token,
        body: {
          fullName: profile.fullName || undefined,
          phone: profile.phone || undefined,
          collegeName: profile.collegeName || undefined,
          course: profile.course || undefined,
          graduationYear: profile.graduationYear || undefined,
          city: profile.city || undefined,
          linkedinUrl: profile.linkedinUrl || undefined,
          githubUrl: profile.githubUrl || undefined,
          mySkillsPlusUrl: profile.mySkillsPlusUrl || undefined,
          skills,
          acceptTerms: true,
        },
      });
      setProfile(updated);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="fullName" required>Full name</Label>
        <Input
          id="fullName"
          required
          value={profile.fullName ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="phone" required>Phone</Label>
        <Input
          id="phone"
          type="tel"
          required
          pattern="(\+?91[\s-]?)?[6-9]\d{9}"
          title="A 10-digit Indian mobile number, optionally with a +91 country code"
          value={profile.phone ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
          placeholder="9876543210"
        />
      </div>
      <div>
        <Label htmlFor="collegeName" required>College name</Label>
        <Input
          id="collegeName"
          required
          value={profile.collegeName ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, collegeName: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="course" required>Course</Label>
        <Input
          id="course"
          required
          value={profile.course ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, course: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="graduationYear" required>Graduation year</Label>
        <Select
          id="graduationYear"
          required
          value={profile.graduationYear ?? ''}
          onChange={(e) =>
            setProfile((p) => ({ ...p, graduationYear: Number(e.target.value) || undefined }))
          }
        >
          <option value="">Select year</option>
          {graduationYearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="city" required>City</Label>
        <Input
          id="city"
          required
          value={profile.city ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="skills" required>Skills (comma-separated)</Label>
        <Input
          id="skills"
          required
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="React, Node.js, SQL"
        />
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <a
            href={profile.linkedinUrl || 'https://www.linkedin.com/'}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sp-blue hover:underline"
          >
            Open LinkedIn ↗
          </a>
        </div>
        <Input
          id="linkedinUrl"
          type="url"
          value={profile.linkedinUrl ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
          placeholder="https://linkedin.com/in/…"
        />
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="githubUrl">GitHub URL</Label>
          <a
            href={profile.githubUrl || 'https://github.com/'}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sp-blue hover:underline"
          >
            Open GitHub ↗
          </a>
        </div>
        <Input
          id="githubUrl"
          type="url"
          value={profile.githubUrl ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, githubUrl: e.target.value }))}
          placeholder="https://github.com/…"
        />
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="mySkillsPlusUrl">My Skills Plus profile URL</Label>
          <a
            href="https://apps.myskillsplus.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sp-blue hover:underline"
          >
            Open My Skills Plus ↗
          </a>
        </div>
        <Input
          id="mySkillsPlusUrl"
          type="url"
          value={profile.mySkillsPlusUrl ?? ''}
          onChange={(e) => setProfile((p) => ({ ...p, mySkillsPlusUrl: e.target.value }))}
          placeholder="https://apps.myskillsplus.com/…"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-start gap-2 text-sm text-sp-ink-2">
          <input
            type="checkbox"
            checked={Boolean(profile.acceptedTermsAt) || acceptTerms}
            disabled={Boolean(profile.acceptedTermsAt)}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            I accept the Terms &amp; Conditions of the SWAYAM Plus internship module.
            {profile.acceptedTermsAt && (
              <span className="block text-xs text-sp-ink-3">
                Accepted on{' '}
                {new Date(profile.acceptedTermsAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </span>
        </label>
      </div>

      {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}
      {saved && <p className="sm:col-span-2 text-sm font-semibold text-sp-good">Profile saved!</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving || !(acceptTerms || profile.acceptedTermsAt)} withArrow>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}
