'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { OtpFlow } from '@/components/auth/OtpFlow';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { INTERNSHIP_CATEGORIES } from '@/lib/categories';
import type { Student, StudentPreferences } from '@/lib/types';

const MODE_OPTIONS = ['remote', 'onsite', 'hybrid'] as const;
const EMPLOYMENT_TYPE_OPTIONS = ['full-time', 'part-time'] as const;

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function PreferencesCard({ token }: { token: string | null }) {
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  const [locationsText, setLocationsText] = useState('');
  const [rolesText, setRolesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
          availability: prefs.availability || undefined,
          preferredLocations: locationsText.split(',').map((s) => s.trim()).filter(Boolean),
          rolesOfInterest: rolesText.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      setPrefs(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Internship types you're interested in</Label>
        <div className="flex flex-wrap gap-2">
          {INTERNSHIP_CATEGORIES.map((category) => {
            const active = prefs.preferredCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setPrefs((p) => p && { ...p, preferredCategories: toggleInArray(p.preferredCategories, category) })
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Work mode</Label>
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((mode) => {
            const active = prefs.preferredModes.includes(mode);
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setPrefs((p) => p && { ...p, preferredModes: toggleInArray(p.preferredModes, mode) })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Full-time / part-time</Label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPE_OPTIONS.map((type) => {
            const active = prefs.preferredEmploymentTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setPrefs((p) => p && { ...p, preferredEmploymentTypes: toggleInArray(p.preferredEmploymentTypes, type) })
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                  active ? 'border-sp-blue bg-sp-blue text-white' : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                }`}
              >
                {type}
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
          onChange={(e) => setPrefs((p) => p && { ...p, paidPreference: e.target.value as StudentPreferences['paidPreference'] })}
          className="w-full rounded-sp-lg border border-black/10 px-3 py-2 text-sm text-sp-navy outline-none focus:border-sp-blue"
        >
          <option value="either">Either</option>
          <option value="paid">Paid only</option>
          <option value="unpaid">Unpaid is fine</option>
        </select>
      </div>
      <div>
        <Label htmlFor="availability">Availability</Label>
        <Input
          id="availability"
          value={prefs.availability ?? ''}
          onChange={(e) => setPrefs((p) => p && { ...p, availability: e.target.value })}
          placeholder="Immediately, From June 2026, …"
        />
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

export default function StudentRegisterPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<Partial<Student>>({});
  const [skillsText, setSkillsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [resumeStatus, setResumeStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  const isStudent = user?.role === 'student';
  // undefined = still checking, true = complete (redirecting to dashboard),
  // false = incomplete (show the form below).
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isStudent || !token) return;
    apiFetch<Student>('/students/me', { token })
      .then((s) => {
        if (s.profileComplete) {
          // Already set up — landing on the profile form again on every
          // login is pointless busywork. Send them straight to the
          // dashboard instead, whether this was a fresh OTP verify or a
          // returning, already-authenticated visit to this page.
          setProfileComplete(true);
          router.replace('/student/dashboard');
          return;
        }
        setProfileComplete(false);
        setProfile(s);
        setSkillsText((s.skills ?? []).join(', '));
      })
      .catch(() => setProfileComplete(false));
  }, [isStudent, token, router]);

  if (!isStudent && !verified) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-2xl font-extrabold text-sp-navy">
          Student registration
        </h1>
        <p className="mb-6 text-center text-sp-ink-2">
          Verify your email with a one-time code — no password needed.
        </p>
        <Card className="p-6">
          <OtpFlow role="student" onVerified={() => setVerified(true)} />
        </Card>
      </div>
    );
  }

  if (profileComplete === undefined || profileComplete === true) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/students/me', {
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
          skills: skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async (file: File, input: HTMLInputElement) => {
    setResumeStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await apiFetch<Student>('/students/me/resume', {
        method: 'POST',
        token,
        body: formData,
      });
      setProfile(updated);
      setResumeStatus('done');
      // Otherwise the native file input keeps showing the just-selected
      // filename, which then sits next to the server's randomized storage
      // filename below — two different names for the same file reads as a
      // mismatch/error rather than a successful upload.
      input.value = '';
    } catch {
      setResumeStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-extrabold text-sp-navy">Complete your profile</h1>
      <p className="mb-6 text-sp-ink-2">
        This helps employers understand your background when you apply.
      </p>
      <Card className="p-6">
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={profile.fullName ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="collegeName">College name</Label>
            <Input
              id="collegeName"
              value={profile.collegeName ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, collegeName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="course">Course</Label>
            <Input
              id="course"
              value={profile.course ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, course: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="graduationYear">Graduation year</Label>
            <Input
              id="graduationYear"
              type="number"
              value={profile.graduationYear ?? ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, graduationYear: Number(e.target.value) || undefined }))
              }
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={profile.city ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input
              id="skills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="React, Node.js, SQL"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              value={profile.linkedinUrl ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
              placeholder="https://linkedin.com/in/…"
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}
          {saved && (
            <p className="sm:col-span-2 text-sm font-semibold text-sp-good">Profile saved!</p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving} withArrow>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/internships')}>
              Browse internships
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Resume</h2>
        <p className="mb-4 text-sm text-sp-ink-2">
          Upload a PDF or Word document — employers see this when you apply.
        </p>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0], e.target)}
          className="text-sm"
        />
        {resumeStatus === 'uploading' && <p className="mt-2 text-sm text-sp-ink-3">Uploading…</p>}
        {resumeStatus === 'done' && (
          <p className="mt-2 text-sm font-semibold text-sp-good">Resume uploaded.</p>
        )}
        {resumeStatus === 'error' && (
          <p className="mt-2 text-sm font-semibold text-sp-danger">Upload failed. Try again.</p>
        )}
        {profile.resumeUrl && (
          <p className="mt-2 text-sm text-sp-ink-3">
            Resume on file —{' '}
            <a
              href={resolveFileUrl(profile.resumeUrl)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sp-blue"
            >
              View resume
            </a>
          </p>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Preferences</h2>
        <p className="mb-4 text-sm text-sp-ink-2">
          Optional, but helps us surface internships that actually match what you want.
        </p>
        <PreferencesCard token={token} />
      </Card>
    </div>
  );
}
