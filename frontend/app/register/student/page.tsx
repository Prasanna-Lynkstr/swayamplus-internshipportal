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
import type { Student } from '@/lib/types';

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

  useEffect(() => {
    if (!isStudent || !token) return;
    apiFetch<Student>('/students/me', { token })
      .then((s) => {
        setProfile(s);
        setSkillsText((s.skills ?? []).join(', '));
      })
      .catch(() => {});
  }, [isStudent, token]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/students/me', {
        method: 'PATCH',
        token,
        body: {
          ...profile,
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

  const uploadResume = async (file: File) => {
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
          onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])}
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
            Current file:{' '}
            <a
              href={resolveFileUrl(profile.resumeUrl)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sp-blue"
            >
              {profile.resumeUrl.split('/').pop()}
            </a>
          </p>
        )}
      </Card>
    </div>
  );
}
