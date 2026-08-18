'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/Badge';
import { ContactRow, IconMail, IconPhone, LinkChip } from '@/components/ui/ContactLinks';
import { resolveFileUrl } from '@/lib/files';
import { EMPLOYER_VERIFICATION_STATUS_TONE } from '@/lib/status-labels';
import type { Employer } from '@/lib/types';

interface Props {
  employer: Employer | null;
  onClose: () => void;
}

// A read-only view of everything an employer submitted, laid out exactly as
// captured — no admin-side reformatting. Every employer account is now
// created already-approved via EmployerEoi review (see
// EmployerEoiSubmissionModal, the actual decision surface), so this modal
// has no approve/reject affordance of its own — it's a directory detail
// view, not a review queue. Two columns (org identity/contact/links on the
// left, the actual reason-for-EOI plus remaining facts on the right) for the
// same reason the applicant profile modal is laid out this way: the old
// single-column stack of label/value pairs needed a scroll for almost every
// submission, most of it spent on facts (organization name, CIN, headcount)
// that fit in a few compact lines rather than a full-width dt/dd grid.
export function EmployerEoiModal({ employer, onClose }: Props) {
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

  const initial = (employer.organizationName ?? 'E').charAt(0).toUpperCase();

  // Only meaningfully-set facts get a row, same reasoning as the applicant
  // modal's Preferences list — an unset optional field shouldn't cost a full
  // grid cell just to say "Not provided" a second time.
  const factRows: Array<{ label: string; value: string }> = [
    employer.cin && { label: 'CIN', value: employer.cin },
    employer.headcount != null && { label: 'Headcount', value: String(employer.headcount) },
    employer.acceptedTermsAt && {
      label: 'Terms accepted',
      value: new Date(employer.acceptedTermsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

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
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sp-xl bg-sp-bg-elev shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-sp-ink-3 shadow-sm hover:bg-white hover:text-sp-navy"
        >
          &times;
        </button>

        <div className="grid flex-1 grid-cols-1 items-start overflow-y-auto lg:grid-cols-[290px_1fr] lg:divide-x lg:divide-black/5">
          {/* Identity rail */}
          <div className="flex flex-col gap-5 border-b border-black/5 bg-sp-bg-sunken/60 p-5 lg:border-b-0">
            <div className="flex flex-col items-center gap-2 rounded-sp-lg bg-sp-pastel-peach/60 p-5 text-center">
              {employer.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
                <img
                  src={resolveFileUrl(employer.logoUrl)}
                  alt={`${employer.organizationName ?? 'Employer'} logo`}
                  className="h-16 w-16 rounded-full bg-white object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-black text-sp-ink-2">
                  {initial}
                </div>
              )}
              <h2 className="text-base font-extrabold text-sp-navy">
                {employer.organizationName || 'Unnamed organization'}
              </h2>
              {employer.hqCity && <p className="text-xs text-sp-ink-3">{employer.hqCity}</p>}
              <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]}>
                {employer.verificationStatus}
              </Badge>
              <p className="text-[11px] text-sp-ink-3">
                Applied {new Date(employer.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Contact</p>
              <p className="text-sm font-semibold text-sp-navy">
                {employer.contactPersonName || <span className="font-normal text-sp-ink-3">No name on file</span>}
              </p>
              <ContactRow icon={<IconPhone />} value={employer.contactPersonPhone} />
              <ContactRow icon={<IconMail />} value={employer.user?.identifier} />
            </div>

            {(employer.industryTags.length > 0 || employer.internshipTypesExpected.length > 0) && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {employer.industryTags.map((tag) => (
                    <Badge key={`industry-${tag}`}>{tag}</Badge>
                  ))}
                  {employer.internshipTypesExpected.map((tag) => (
                    <Badge key={`type-${tag}`}>{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Links</p>
              <div className="flex flex-wrap gap-1.5">
                <LinkChip
                  label="Certificate of Incorporation"
                  href={employer.certificateOfIncorporationUrl ? resolveFileUrl(employer.certificateOfIncorporationUrl) : null}
                  accent
                />
                <LinkChip label="Website" href={employer.website} />
                <LinkChip label="LinkedIn" href={employer.linkedinBusinessPage} />
              </div>
            </div>
          </div>

          {/* Decision-relevant content */}
          <div className="flex flex-col gap-5 p-5">
            <div className="rounded-sp-md bg-sp-pastel-lavender p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Reason for EOI</p>
              <p className="whitespace-pre-wrap text-sm text-sp-ink-2">
                {employer.reasonForEoi || <span className="text-sp-ink-3">Not provided</span>}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Other details</p>
              {factRows.length === 0 ? (
                <p className="text-sm text-sp-ink-3">No further details on file.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {factRows.map((row) => (
                    <p key={row.label} className="text-sm text-sp-ink-2">
                      <span className="font-semibold text-sp-navy">{row.label}:</span> {row.value}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
