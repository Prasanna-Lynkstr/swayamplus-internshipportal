'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { resolveFileUrl } from '@/lib/files';
import { EMPLOYER_VERIFICATION_STATUS_TONE } from '@/lib/status-labels';
import type { Employer } from '@/lib/types';

interface Props {
  employer: Employer | null;
  onClose: () => void;
  onApprove: (employer: Employer) => void;
  onReject: (employer: Employer) => void;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm text-sp-navy">{value || <span className="text-sp-ink-3">Not provided</span>}</dd>
    </div>
  );
}

function LinkField({ label, href }: { label: string; href: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-sp-blue hover:underline"
          >
            {href}
          </a>
        ) : (
          <span className="text-sp-ink-3">Not provided</span>
        )}
      </dd>
    </div>
  );
}

// Every field the employer submitted on their EOI, laid out exactly as
// captured — no admin-side reformatting — so a reviewer can approve/reject
// against what was actually submitted rather than the trimmed-down summary
// shown on the list card.
export function EmployerEoiModal({ employer, onClose, onApprove, onReject }: Props) {
  useEffect(() => {
    if (!employer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [employer, onClose]);

  if (!employer || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Employer EOI details"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-sp-xl bg-sp-bg-elev shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-sp-ink-2">
                EOI submission
              </h2>
              <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]}>
                {employer.verificationStatus}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-sp-ink-3">
              Applied on {new Date(employer.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-navy"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 rounded-sp-md bg-sp-pastel-lavender p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Applied by</p>
            <p className="mt-0.5 text-base font-extrabold text-sp-navy">
              {employer.contactPersonName || 'Contact name not provided'}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-sp-ink-2">
              {employer.contactPersonPhone || 'No phone provided'}
              {employer.user?.identifier ? ` · ${employer.user.identifier}` : ''}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Organization name" value={employer.organizationName} />
            <Field label="CIN" value={employer.cin} />
            <Field label="Headcount" value={employer.headcount != null ? String(employer.headcount) : null} />
            <Field label="HQ city" value={employer.hqCity} />
            <LinkField label="Website" href={employer.website} />
            <LinkField label="LinkedIn business page" href={employer.linkedinBusinessPage} />
            <Field
              label="Industry tags"
              value={employer.industryTags.length > 0 ? employer.industryTags.join(', ') : null}
            />
            <Field
              label="Internship types expected"
              value={
                employer.internshipTypesExpected.length > 0
                  ? employer.internshipTypesExpected.join(', ')
                  : null
              }
            />
            <Field
              label="Terms accepted"
              value={employer.acceptedTermsAt ? new Date(employer.acceptedTermsAt).toLocaleString() : null}
            />
          </dl>

          <div className="mt-4">
            <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Reason for EOI</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-sp-navy">
              {employer.reasonForEoi || <span className="text-sp-ink-3">Not provided</span>}
            </dd>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {employer.certificateOfIncorporationUrl ? (
              <a
                href={resolveFileUrl(employer.certificateOfIncorporationUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-sp-blue"
              >
                View Certificate of Incorporation
              </a>
            ) : (
              <p className="text-sm text-sp-ink-3">No certificate uploaded.</p>
            )}
            {employer.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveFileUrl(employer.logoUrl)}
                alt={`${employer.organizationName ?? 'Employer'} logo`}
                className="h-12 w-12 rounded-sp-md border border-black/10 object-contain"
              />
            )}
          </div>
        </div>

        {employer.verificationStatus === 'pending' && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-black/5 px-6 py-4">
            <Button variant="secondary" onClick={() => onReject(employer)}>
              Reject
            </Button>
            <Button onClick={() => onApprove(employer)}>Approve</Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
