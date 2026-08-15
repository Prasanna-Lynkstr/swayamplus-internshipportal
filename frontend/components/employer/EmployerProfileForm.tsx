'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input, Label, Textarea } from '@/components/ui/Input';
import type { Employer } from '@/lib/types';

function ReviewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-sp-navy">{value}</p>
    </div>
  );
}

// Self-contained (fetches its own /employers/me) — reused for both the
// initial EOI submission (register/employer, mode="register") and later
// edits (employer/profile, mode="edit"). Fields/save logic are identical
// either way — the only difference is presentation: `register` walks
// through the same fields as a 3-step wizard (Organization → Documents →
// Review), gating each "Next" on the native validity of that step's visible
// fields (see goToStep below) plus one manual check for the certificate
// upload, which can't be a native `required` input since it's visually
// hidden behind a styled button — hidden inputs are skipped by browser
// constraint validation entirely. `edit` renders every field on one screen,
// unchanged from before.
export function EmployerProfileForm({
  token,
  mode,
  onStepChange,
}: {
  token: string | null;
  mode: 'register' | 'edit';
  /** Fired whenever the register-mode wizard step changes — lets the page
   * keep its RegistrationProgress bar in sync. Unused in edit mode. */
  onStepChange?: (step: number) => void;
}) {
  const categories = useTaxonomy('internship_category');
  const [profile, setProfile] = useState<Partial<Employer>>({});
  const [tagsText, setTagsText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const isWizard = mode === 'register';
  const showStep = (s: number) => !isWizard || step === s;

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token }).then((e) => {
      setProfile(e);
      setTagsText((e.industryTags ?? []).join(', '));
      setLoaded(true);
    });
  }, [token]);

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStepChange is a caller-provided callback, not reactive state to depend on
  }, [step]);

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

  const goToStep = (target: number) => {
    // Only validates fields currently mounted (the visible step's) — the
    // other steps' fields aren't in the DOM while hidden, so this can't
    // block on a field the student hasn't reached yet. Covers every plain
    // text/url/number input's `required` attribute; the two checks below
    // handle the fields native validation can't reach — a comma-separated
    // text field can be non-blank but still empty after splitting (e.g.
    // just ","), and the chip-toggle group has no underlying <input> at all.
    if (formRef.current && !formRef.current.reportValidity()) return;
    if (step === 0 && target === 1) {
      const hasIndustryTag = tagsText
        .split(',')
        .map((s) => s.trim())
        .some(Boolean);
      if (!hasIndustryTag) {
        setError(['Add at least one industry tag.']);
        return;
      }
    }
    if (step === 1 && target === 2) {
      if (!pendingFile && !profile.certificateOfIncorporationUrl) {
        setError(['Upload your Certificate of Incorporation to continue.']);
        return;
      }
      if ((profile.internshipTypesExpected ?? []).length === 0) {
        setError(['Select at least one internship type you expect to offer.']);
        return;
      }
    }
    setError([]);
    setStep(target);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError([]);
    try {
      const body: Record<string, unknown> = {
        organizationName: profile.organizationName,
        contactPersonName: profile.contactPersonName,
        contactPersonPhone: profile.contactPersonPhone,
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
      };
      if (mode === 'register') {
        body.acceptTerms = true;
      }
      let updated = await apiFetch<Employer>(mode === 'register' ? '/employers/register' : '/employers/me', {
        method: mode === 'register' ? 'POST' : 'PATCH',
        token,
        body,
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

  const canSubmit = mode === 'edit' || acceptTerms || Boolean(profile.acceptedTermsAt);

  return (
    <div>
      <form ref={formRef} onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showStep(0) && (
          <>
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
            <div className="sm:col-span-2">
              <Label htmlFor="reasonForEoi" required>
                Reason for expressing interest
              </Label>
              <Textarea
                id="reasonForEoi"
                required
                rows={3}
                value={profile.reasonForEoi ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, reasonForEoi: e.target.value }))}
                placeholder="What kind of internships do you want to offer, and why on SWAYAM Plus?"
              />
            </div>
            <div>
              <Label htmlFor="hqCity" required={isWizard}>
                HQ city
              </Label>
              <Input
                id="hqCity"
                required={isWizard}
                value={profile.hqCity ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, hqCity: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="industryTags" required={isWizard}>
                Industry tags (comma-separated)
              </Label>
              <Input
                id="industryTags"
                required={isWizard}
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="IT/ITeS, BFSI"
              />
            </div>
          </>
        )}

        {isWizard && step === 0 && (
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" onClick={() => goToStep(1)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {showStep(1) && (
          <>
            <div className="sm:col-span-2">
              <Label htmlFor="certificate" required={isWizard}>
                Certificate of Incorporation
              </Label>
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
              <Label htmlFor="cin" required={isWizard}>
                CIN
              </Label>
              <Input
                id="cin"
                required={isWizard}
                value={profile.cin ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, cin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="headcount" required={isWizard}>
                Headcount
              </Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                required={isWizard}
                value={profile.headcount ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, headcount: e.target.value ? Number(e.target.value) : null }))
                }
              />
            </div>
            <div>
              <Label htmlFor="linkedinBusinessPage" required={isWizard}>
                LinkedIn business page
              </Label>
              <Input
                id="linkedinBusinessPage"
                type="url"
                required={isWizard}
                value={profile.linkedinBusinessPage ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, linkedinBusinessPage: e.target.value }))}
                placeholder="https://linkedin.com/company/…"
              />
            </div>
            <div>
              <Label htmlFor="website" required={isWizard}>
                Website
              </Label>
              <Input
                id="website"
                type="url"
                required={isWizard}
                value={profile.website ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label required={isWizard}>Internship types expected</Label>
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
          </>
        )}

        {isWizard && step === 1 && (
          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(0)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(2)} withArrow>
              Continue
            </Button>
          </div>
        )}

        {isWizard && step === 2 && (
          <div className="sm:col-span-2 flex flex-col gap-4 rounded-sp-lg bg-sp-bg-sunken p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
              Review before you submit
            </p>

            <ReviewField label="Organization name" value={profile.organizationName || '—'} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReviewField label="Contact person" value={profile.contactPersonName || '—'} />
              <ReviewField label="Contact mobile number" value={profile.contactPersonPhone || '—'} />
            </div>
            <ReviewField
              label="Reason for expressing interest"
              value={<span className="font-normal text-sp-ink-2">{profile.reasonForEoi || '—'}</span>}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReviewField label="HQ city" value={profile.hqCity || '—'} />
              <ReviewField label="CIN" value={profile.cin || '—'} />
              <ReviewField
                label="Headcount"
                value={profile.headcount ? `${profile.headcount} employees` : '—'}
              />
              <ReviewField
                label="LinkedIn business page"
                value={
                  profile.linkedinBusinessPage ? (
                    <a
                      href={profile.linkedinBusinessPage}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-sp-blue hover:underline"
                    >
                      {profile.linkedinBusinessPage}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <ReviewField
                label="Website"
                value={
                  profile.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-sp-blue hover:underline"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <ReviewField
                label="Certificate of Incorporation"
                value={pendingFile?.name ?? (profile.certificateOfIncorporationUrl ? 'Already on file' : '—')}
              />
            </div>

            <ReviewField
              label="Industry tags"
              value={
                tagsText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean).length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {tagsText
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <ReviewField
              label="Internship types expected"
              value={
                (profile.internshipTypesExpected ?? []).length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {(profile.internshipTypesExpected ?? []).map((value) => (
                      <Badge key={value} tone="orange">
                        {categories.find((c) => c.value === value)?.label ?? value}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  '—'
                )
              }
            />
          </div>
        )}

        {isWizard && step === 2 && (
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
        )}

        {error.length > 0 && (
          <div className="sm:col-span-2">
            <FormError messages={error} />
          </div>
        )}
        {saved && (
          <p className="sm:col-span-2 text-sm font-semibold text-sp-good">
            {mode === 'register' ? "Submitted! We'll notify you once it's reviewed." : 'Profile saved!'}
          </p>
        )}

        {isWizard && saved ? (
          // The EOI is a one-shot submission — once it's gone through, a
          // still-clickable "Submit expression of interest" button next to
          // the success message reads like nothing happened and invites a
          // pointless resubmit. Give a real next step instead.
          <div className="sm:col-span-2">
            <LinkButton href="/employer/dashboard" withArrow>
              Go to your dashboard
            </LinkButton>
          </div>
        ) : (
          (mode === 'edit' || step === 2) && (
            <div className="sm:col-span-2 flex items-center justify-between">
              {isWizard && (
                <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
                  ← Back
                </Button>
              )}
              <Button type="submit" disabled={saving || !canSubmit} withArrow className="ml-auto">
                {saving
                  ? mode === 'register'
                    ? 'Submitting…'
                    : 'Saving…'
                  : mode === 'register'
                    ? 'Submit expression of interest'
                    : 'Save profile'}
              </Button>
            </div>
          )
        )}
      </form>
    </div>
  );
}
