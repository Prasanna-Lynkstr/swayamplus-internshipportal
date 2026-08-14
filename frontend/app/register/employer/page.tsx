'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { INTERNSHIP_CATEGORIES } from '@/lib/categories';
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
} as const;

export default function EmployerRegisterPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<Partial<Employer>>({});
  const [tagsText, setTagsText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // undefined = still checking, true = complete (redirecting to dashboard),
  // false = incomplete (show the form below).
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined);

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
        if (e.profileComplete) {
          // Already set up — landing on the EOI form again on every login is
          // pointless busywork. Send them straight to the dashboard instead,
          // whether this was a fresh OTP verify or a returning visit.
          setProfileComplete(true);
          router.replace('/employer/dashboard');
          return;
        }
        setProfileComplete(false);
        setProfile(e);
        setTagsText((e.industryTags ?? []).join(', '));
      })
      .catch(() => setProfileComplete(false));
  }, [isEmployer, token, router]);

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

  if (profileComplete === undefined || profileComplete === true) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  const toggleInternshipType = (category: string) => {
    setProfile((p) => {
      const current = p.internshipTypesExpected ?? [];
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...p, internshipTypesExpected: next };
    });
  };

  // A single expression-of-interest submission: the org profile fields and
  // the Certificate of Incorporation go up together from one button click,
  // then the whole thing sits in `pending` for one admin decision — no
  // separate document-upload gate to clear first.
  const submitEoi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let updated = await apiFetch<Employer>('/employers/register', {
        method: 'POST',
        token,
        body: {
          organizationName: profile.organizationName,
          reasonForEoi: profile.reasonForEoi,
          cin: profile.cin || undefined,
          headcount: profile.headcount || undefined,
          linkedinBusinessPage: profile.linkedinBusinessPage || undefined,
          internshipTypesExpected: profile.internshipTypesExpected ?? [],
          website: profile.website || undefined,
          hqCity: profile.hqCity || undefined,
          industryTags: tagsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });

      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        updated = await apiFetch<Employer>('/employers/me/certificate-of-incorporation', {
          method: 'POST',
          token,
          body: formData,
        });
      }

      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your EOI.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-sp-navy">Expression of interest</h1>
        {profile.verificationStatus && (
          <Badge tone={STATUS_TONE[profile.verificationStatus]}>{profile.verificationStatus}</Badge>
        )}
      </div>
      <p className="mb-6 -mt-4 text-sm text-sp-ink-2">
        Tell us about your organization in one go — our admin team reviews every submission and
        approves or rejects it as a single decision.
      </p>

      <Card className="p-6">
        <form onSubmit={submitEoi} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              required
              value={profile.organizationName ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, organizationName: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reasonForEoi">Reason for expressing interest</Label>
            <textarea
              id="reasonForEoi"
              required
              rows={3}
              value={profile.reasonForEoi ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, reasonForEoi: e.target.value }))}
              placeholder="What kind of internships do you want to offer, and why on SWAYAM Plus?"
              className="w-full rounded-sp-lg border border-black/10 px-3 py-2 text-sm text-sp-navy outline-none focus:border-sp-blue"
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
            <Label htmlFor="headcount">Headcount</Label>
            <Input
              id="headcount"
              type="number"
              min={1}
              value={profile.headcount ?? ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, headcount: e.target.value ? Number(e.target.value) : null }))
              }
            />
          </div>
          <div>
            <Label htmlFor="linkedinBusinessPage">LinkedIn business page</Label>
            <Input
              id="linkedinBusinessPage"
              value={profile.linkedinBusinessPage ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, linkedinBusinessPage: e.target.value }))}
              placeholder="https://linkedin.com/company/…"
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
          <div className="sm:col-span-2">
            <Label>Internship types expected</Label>
            <div className="flex flex-wrap gap-2">
              {INTERNSHIP_CATEGORIES.map((category) => {
                const active = (profile.internshipTypesExpected ?? []).includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleInternshipType(category)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? 'border-sp-blue bg-sp-blue text-white'
                        : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="certificate">Certificate of Incorporation</Label>
            <input
              id="certificate"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {profile.certificateOfIncorporationUrl && !pendingFile && (
              <p className="mt-2 text-sm text-sp-ink-3">
                On file —{' '}
                <a
                  href={resolveFileUrl(profile.certificateOfIncorporationUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sp-blue"
                >
                  View document
                </a>
              </p>
            )}
          </div>

          {error && <p className="sm:col-span-2 text-sm font-semibold text-sp-danger">{error}</p>}
          {saved && (
            <p className="sm:col-span-2 text-sm font-semibold text-sp-good">
              Submitted! We&apos;ll notify you once it&apos;s reviewed.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving} withArrow>
              {saving ? 'Submitting…' : 'Submit expression of interest'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
