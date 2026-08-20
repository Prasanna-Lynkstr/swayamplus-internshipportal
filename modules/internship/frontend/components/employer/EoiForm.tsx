'use client';

import { useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { EmployerEoiTermsModal } from '@/components/employer/EmployerEoiTermsModal';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';

const STEP_LABELS = ['Organization', 'Documents', 'Review'];

interface EoiFields {
  email: string;
  organizationName: string;
  contactPersonName: string;
  contactPersonPhone: string;
  reasonForEoi: string;
  hqCity: string;
  cin: string;
  headcount: string;
  linkedinBusinessPage: string;
  website: string;
  internshipTypesExpected: string[];
}

const EMPTY: EoiFields = {
  email: '',
  organizationName: '',
  contactPersonName: '',
  contactPersonPhone: '',
  reasonForEoi: '',
  hqCity: '',
  cin: '',
  headcount: '',
  linkedinBusinessPage: '',
  website: '',
  internshipTypesExpected: [],
};

function ReviewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-sp-navy">{value}</p>
    </div>
  );
}

// The public, no-account counterpart to EmployerProfileForm's register mode
// — same 3-step wizard shape and field set (organization → documents →
// review), but everything submits in one multipart POST to /employer-eoi
// with no token, since there's no account yet to attach a JWT to. This is
// deliberately a separate component rather than a third mode bolted onto
// EmployerProfileForm: that component's token/prefetch/two-call submit
// (register, then a separate upload call) doesn't apply here at all, and
// forcing it in would mean threading "is this public" through most of its
// branches.
export function EoiForm() {
  const categories = useTaxonomy('internship_category');
  const [fields, setFields] = useState<EoiFields>(EMPTY);
  const [tagsText, setTagsText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string[]>([]);

  const set = <K extends keyof EoiFields>(key: K, value: EoiFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const toggleInternshipType = (value: string) => {
    setFields((f) => ({
      ...f,
      internshipTypesExpected: f.internshipTypesExpected.includes(value)
        ? f.internshipTypesExpected.filter((v) => v !== value)
        : [...f.internshipTypesExpected, value],
    }));
  };

  const goToStep = (target: number) => {
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
      if (!file) {
        setError(['Upload your Certificate of Incorporation to continue.']);
        return;
      }
      if (fields.internshipTypesExpected.length === 0) {
        setError(['Select at least one internship type you expect to offer.']);
        return;
      }
    }
    setError([]);
    setStep(target);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(['Upload your Certificate of Incorporation to continue.']);
      return;
    }
    setSubmitting(true);
    setError([]);
    try {
      const formData = new FormData();
      formData.append('email', fields.email);
      formData.append('organizationName', fields.organizationName);
      formData.append('contactPersonName', fields.contactPersonName);
      formData.append('contactPersonPhone', fields.contactPersonPhone);
      formData.append('reasonForEoi', fields.reasonForEoi);
      formData.append('hqCity', fields.hqCity);
      formData.append('cin', fields.cin);
      formData.append('headcount', fields.headcount);
      formData.append('linkedinBusinessPage', fields.linkedinBusinessPage);
      formData.append('website', fields.website);
      formData.append('internshipTypesExpected', JSON.stringify(fields.internshipTypesExpected));
      formData.append(
        'industryTags',
        JSON.stringify(
          tagsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      );
      formData.append('acceptTerms', 'true');
      formData.append('file', file);

      await apiFetch('/employer-eoi', { method: 'POST', body: formData });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : ['Could not submit your EOI. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-sp-lg bg-sp-good-soft p-6 text-center">
        <p className="text-lg font-extrabold text-sp-good-ink">Expression of Interest submitted!</p>
        <p className="mt-2 text-sm text-sp-ink-2">
          Our team will review it and email <strong>{fields.email}</strong> with a decision. Once
          approved, sign in with this same email (via OTP, no password needed) to access your
          employer dashboard.
        </p>
      </div>
    );
  }

  return (
    <>
      <RegistrationProgress labels={STEP_LABELS} current={step + 1} />
      <form ref={formRef} onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {step === 0 && (
        <>
          <div className="sm:col-span-2">
            <Label htmlFor="email" required>
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={fields.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="organizationName" required>
              Organization name
            </Label>
            <Input
              id="organizationName"
              required
              value={fields.organizationName}
              onChange={(e) => set('organizationName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contactPersonName" required>
              Contact person name
            </Label>
            <Input
              id="contactPersonName"
              required
              value={fields.contactPersonName}
              onChange={(e) => set('contactPersonName', e.target.value)}
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
              pattern="(\+?91[\s\-]?)?[6-9]\d{9}"
              title="A 10-digit Indian mobile number, optionally with a +91 country code"
              value={fields.contactPersonPhone}
              onChange={(e) => set('contactPersonPhone', e.target.value)}
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
              value={fields.reasonForEoi}
              onChange={(e) => set('reasonForEoi', e.target.value)}
              placeholder="What kind of internships do you want to offer, and why on SWAYAM Plus?"
            />
          </div>
          <div>
            <Label htmlFor="hqCity" required>
              HQ city
            </Label>
            <Input
              id="hqCity"
              required
              value={fields.hqCity}
              onChange={(e) => set('hqCity', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="industryTags" required>
              Industry tags (comma-separated)
            </Label>
            <Input
              id="industryTags"
              required
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="IT/ITeS, BFSI"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" onClick={() => goToStep(1)} withArrow>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="sm:col-span-2">
            <Label htmlFor="certificate" required>
              Certificate of Incorporation
            </Label>
            <input
              ref={fileInputRef}
              id="certificate"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {file ? 'Replace file' : 'Choose file'}
              </Button>
              {file && <span className="text-sm text-sp-ink-3">{file.name}</span>}
            </div>
          </div>
          <div>
            <Label htmlFor="cin" required>
              CIN
            </Label>
            <Input id="cin" required value={fields.cin} onChange={(e) => set('cin', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="headcount" required>
              Headcount
            </Label>
            <Input
              id="headcount"
              type="number"
              min={1}
              required
              value={fields.headcount}
              onChange={(e) => set('headcount', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="linkedinBusinessPage" required>
              LinkedIn business page
            </Label>
            <Input
              id="linkedinBusinessPage"
              type="url"
              required
              value={fields.linkedinBusinessPage}
              onChange={(e) => set('linkedinBusinessPage', e.target.value)}
              placeholder="https://linkedin.com/company/…"
            />
          </div>
          <div>
            <Label htmlFor="website" required>
              Website
            </Label>
            <Input
              id="website"
              type="url"
              required
              value={fields.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label required>Internship types expected</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = fields.internshipTypesExpected.includes(category.value);
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
          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(0)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(2)} withArrow>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="sm:col-span-2 flex flex-col gap-4 rounded-sp-lg bg-sp-bg-sunken p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
              Review before you submit
            </p>
            <ReviewField label="Organization name" value={fields.organizationName || '—'} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReviewField label="Email" value={fields.email || '—'} />
              <ReviewField label="Contact person" value={fields.contactPersonName || '—'} />
              <ReviewField label="Contact mobile number" value={fields.contactPersonPhone || '—'} />
              <ReviewField label="HQ city" value={fields.hqCity || '—'} />
              <ReviewField label="CIN" value={fields.cin || '—'} />
              <ReviewField label="Headcount" value={fields.headcount ? `${fields.headcount} employees` : '—'} />
              <ReviewField
                label="Certificate of Incorporation"
                value={file?.name ?? '—'}
              />
            </div>
            <ReviewField
              label="Reason for expressing interest"
              value={<span className="font-normal text-sp-ink-2">{fields.reasonForEoi || '—'}</span>}
            />
            <ReviewField
              label="Industry tags"
              value={
                <span className="flex flex-wrap gap-1.5">
                  {tagsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                </span>
              }
            />
            <ReviewField
              label="Internship types expected"
              value={
                <span className="flex flex-wrap gap-1.5">
                  {fields.internshipTypesExpected.map((value) => (
                    <Badge key={value} tone="orange">
                      {categories.find((c) => c.value === value)?.label ?? value}
                    </Badge>
                  ))}
                </span>
              }
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm text-sp-ink-2">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1"
              />
              I accept the{' '}
              <button
                type="button"
                onClick={(e) => {
                  // Stop this from bubbling to the enclosing <label> — that
                  // would otherwise also toggle the checkbox as a side effect
                  // of clicking this link.
                  e.preventDefault();
                  e.stopPropagation();
                  setTermsOpen(true);
                }}
                className="font-semibold text-sp-blue underline underline-offset-2 hover:text-sp-navy"
              >
                Terms &amp; Conditions
              </button>{' '}
              of the SWAYAM Plus internship module.
            </label>
          </div>

          <EmployerEoiTermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />

          {error.length > 0 && (
            <div className="sm:col-span-2">
              <FormError messages={error} />
            </div>
          )}

          <div className="sm:col-span-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
              ← Back
            </Button>
            <Button type="submit" disabled={submitting || !acceptTerms} withArrow>
              {submitting ? 'Submitting…' : 'Submit expression of interest'}
            </Button>
          </div>
        </>
      )}

      {error.length > 0 && step !== 2 && (
        <div className="sm:col-span-2">
          <FormError messages={error} />
        </div>
      )}
      </form>
    </>
  );
}
