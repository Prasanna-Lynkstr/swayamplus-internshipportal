'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input, Label } from '@/components/ui/Input';
import type { Employer } from '@/lib/types';

// Self-contained (fetches its own /employers/me) — the employer/profile
// dashboard's edit form. Every field renders on one screen; there's no
// wizard here because there's no self-service registration to wizard
// through anymore — an employer account only ever comes from an approved
// EmployerEoi (see EmployerEoiService.convert), already fully populated.
export function EmployerProfileForm({ token }: { token: string | null }) {
  const categories = useTaxonomy('internship_category');
  const [profile, setProfile] = useState<Partial<Employer>>({});
  const [tagsText, setTagsText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token }).then((e) => {
      setProfile(e);
      setTagsText((e.industryTags ?? []).join(', '));
      setLoaded(true);
    });
  }, [token]);

  if (!loaded) return <p className="text-sm text-sp-ink-3">Loading…</p>;

  const toggleInternshipType = (category: string) => {
    setProfile((p) => {
      const current = p.internshipTypesExpected ?? [];
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...p, internshipTypesExpected: next };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError([]);
    try {
      let updated = await apiFetch<Employer>('/employers/me', {
        method: 'PATCH',
        token,
        body: {
          organizationName: profile.organizationName,
          contactPersonName: profile.contactPersonName,
          contactPersonPhone: profile.contactPersonPhone,
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
        setPendingFile(null);
      }

      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : ['Could not save your profile.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form ref={formRef} onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="organizationName" required>
            Organization name
          </Label>
          <Input
            id="organizationName"
            required
            value={profile.organizationName ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, organizationName: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="contactPersonName" required>
            Contact person name
          </Label>
          <Input
            id="contactPersonName"
            required
            value={profile.contactPersonName ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, contactPersonName: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="contactPersonPhone" required>
            Contact person mobile number
          </Label>
          <Input
            id="contactPersonPhone"
            type="tel"
            required
            pattern="(\+?91[\s-]?)?[6-9]\d{9}"
            title="A 10-digit Indian mobile number, optionally with a +91 country code"
            value={profile.contactPersonPhone ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, contactPersonPhone: e.target.value }))}
            placeholder="9876543210"
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
        <div>
          <Label htmlFor="industryTags">Industry tags (comma-separated)</Label>
          <Input
            id="industryTags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="IT/ITeS, BFSI"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="certificate">Certificate of Incorporation</Label>
          <input
            ref={certificateInputRef}
            id="certificate"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => certificateInputRef.current?.click()}>
              {profile.certificateOfIncorporationUrl ? 'Replace file' : 'Choose file'}
            </Button>
            {pendingFile && <span className="text-sm text-sp-ink-3">{pendingFile.name}</span>}
          </div>
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
            type="url"
            value={profile.linkedinBusinessPage ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, linkedinBusinessPage: e.target.value }))}
            placeholder="https://linkedin.com/company/…"
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={profile.website ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
            placeholder="https://…"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Internship types expected</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = (profile.internshipTypesExpected ?? []).includes(category.value);
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => toggleInternshipType(category.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'border-sp-blue bg-sp-blue text-white'
                      : 'border-black/10 text-sp-ink-2 hover:border-sp-blue'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {error.length > 0 && (
          <div className="sm:col-span-2">
            <FormError messages={error} />
          </div>
        )}
        {saved && <p className="sm:col-span-2 text-sm font-semibold text-sp-good">Profile saved!</p>}

        <div className="sm:col-span-2 flex items-center justify-end">
          <Button type="submit" disabled={saving} withArrow>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
