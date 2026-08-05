'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { OtpFlow } from '@/components/auth/OtpFlow';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { Employer } from '@/lib/types';

const STATUS_TONE = {
  pending: 'orange',
  approved: 'good',
  rejected: 'danger',
  suspended: 'danger',
} as const;

export default function EmployerRegisterPage() {
  const { user, token } = useAuth();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<Partial<Employer>>({});
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  const isEmployer = user?.role === 'employer';

  useEffect(() => {
    apiFetch<{ open: boolean }>('/employers/registration-status')
      .then((res) => setRegistrationOpen(res.open))
      .catch(() => setRegistrationOpen(true));
  }, []);

  useEffect(() => {
    if (!isEmployer || !token) return;
    apiFetch<Employer>('/employers/me', { token })
      .then((e) => {
        setProfile(e);
        setTagsText((e.industryTags ?? []).join(', '));
      })
      .catch(() => {});
  }, [isEmployer, token]);

  if (registrationOpen === null) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  if (!registrationOpen && !isEmployer) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 text-2xl font-extrabold text-sp-navy">Registrations are paused</h1>
        <p className="text-sp-ink-2">
          Employer registration on SWAYAM Plus is temporarily closed while we onboard our current
          partners. Please check back soon.
        </p>
      </div>
    );
  }

  if (!isEmployer && !verified) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-2xl font-extrabold text-sp-navy">
          Employer registration
        </h1>
        <p className="mb-6 text-center text-sp-ink-2">
          Verify your work email with a one-time code to get started.
        </p>
        <Card className="p-6">
          <OtpFlow role="employer" onVerified={() => setVerified(true)} />
        </Card>
      </div>
    );
  }

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await apiFetch<Employer>('/employers/register', {
        method: 'POST',
        token,
        body: {
          organizationName: profile.organizationName,
          cin: profile.cin || undefined,
          gst: profile.gst || undefined,
          website: profile.website || undefined,
          hqCity: profile.hqCity || undefined,
          industryTags: tagsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your organization profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (file: File) => {
    setUploadStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await apiFetch<Employer>('/employers/me/verification-document', {
        method: 'POST',
        token,
        body: formData,
      });
      setProfile(updated);
      setUploadStatus('done');
    } catch {
      setUploadStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-sp-navy">Organization profile</h1>
        {profile.verificationStatus && (
          <Badge tone={STATUS_TONE[profile.verificationStatus]}>
            {profile.verificationStatus}
          </Badge>
        )}
      </div>

      <Card className="mb-6 p-6">
        <form onSubmit={submitProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              required
              value={profile.organizationName ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, organizationName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cin">CIN</Label>
            <Input
              id="cin"
              value={profile.cin ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, cin: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="gst">GST</Label>
            <Input
              id="gst"
              value={profile.gst ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, gst: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={profile.website ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div>
            <Label htmlFor="hqCity">HQ city</Label>
            <Input
              id="hqCity"
              value={profile.hqCity ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, hqCity: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="industryTags">Industry tags (comma-separated)</Label>
            <Input
              id="industryTags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="IT/ITeS, BFSI"
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}
          {saved && <p className="sm:col-span-2 text-sm font-semibold text-sp-good">Saved!</p>}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving} withArrow>
              {saving ? 'Saving…' : 'Save organization profile'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Verification document</h2>
        <p className="mb-4 text-sm text-sp-ink-2">
          Upload an incorporation certificate or GST document so our admin team can verify your
          organization.
        </p>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
          className="text-sm"
        />
        {uploadStatus === 'uploading' && <p className="mt-2 text-sm text-sp-ink-3">Uploading…</p>}
        {uploadStatus === 'done' && (
          <p className="mt-2 text-sm font-semibold text-sp-good">Document uploaded.</p>
        )}
        {uploadStatus === 'error' && (
          <p className="mt-2 text-sm font-semibold text-sp-danger">Upload failed. Try again.</p>
        )}
        {profile.verificationDocumentUrl && (
          <p className="mt-2 text-sm text-sp-ink-3">
            Current file: {profile.verificationDocumentUrl.split('/').pop()}
          </p>
        )}
      </Card>
    </div>
  );
}
