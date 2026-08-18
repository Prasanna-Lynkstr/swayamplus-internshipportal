'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: '1. Eligibility & verification',
    body: (
      <>
        You confirm that the organization named in this submission is a legally registered
        entity in India, that the Corporate Identification Number and Certificate of
        Incorporation provided are genuine and belong to that entity, and that you are
        authorized to act on the organization&apos;s behalf. SWAYAM Plus admin reviews every
        submission before an employer account is created, and may request additional
        documentation or reject a submission that cannot be verified.
      </>
    ),
  },
  {
    heading: '2. Free-of-cost platform',
    body: (
      <>
        Posting internships and reviewing applicants on SWAYAM Plus is free for every verified
        employer. You agree never to ask a student for any fee, deposit, or payment — refundable
        or otherwise — as a condition of applying to, interviewing for, or being offered an
        internship listed on this platform. Accounts found charging students will be suspended
        immediately and reported.
      </>
    ),
  },
  {
    heading: '3. Listing accuracy',
    body: (
      <>
        Every internship you publish must accurately describe the role, stipend (if any),
        duration, work mode, and eligibility criteria. Stipend ranges, working days, and
        application deadlines must reflect your actual offer — listings found to be materially
        misleading may be unpublished without notice.
      </>
    ),
  },
  {
    heading: '4. Fair and lawful conduct',
    body: (
      <>
        You agree to comply with applicable Indian labour law for any internship posted,
        including the Apprentices Act and any stipend, working-hours, or safety obligations that
        apply to interns. Listings and hiring decisions must not discriminate on the basis of
        gender, caste, religion, disability, or any other protected characteristic.
      </>
    ),
  },
  {
    heading: '5. Use of student data',
    body: (
      <>
        Applicant profiles, resumes, and contact details shared through SWAYAM Plus may be used
        only to evaluate that student for the internship they applied to. You will not sell,
        share, or use this data for any other recruitment, marketing, or commercial purpose
        without the student&apos;s explicit consent.
      </>
    ),
  },
  {
    heading: '6. Account review and suspension',
    body: (
      <>
        SWAYAM Plus admin may suspend or revoke employer verification at any time for a violation
        of these terms, a substantiated student complaint, or if information provided at
        registration is later found to be false. Suspension unpublishes all active listings from
        that account until the matter is resolved.
      </>
    ),
  },
  {
    heading: '7. Questions or grievances',
    body: (
      <>
        For questions about these terms or to raise a concern about a listing or an employer on
        the platform, contact the SWAYAM Plus program team through the Ministry of Education
        portal — this Expression of Interest form is reviewed by that same team.
      </>
    ),
  },
];

// Static reference content — no fetch, no ownership check — so this follows
// CompanyProfileModal's portal/Escape/scroll-lock shell but skips its
// loading/error states entirely.
export function EmployerEoiTermsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Employer Terms & Conditions"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-sp-xl bg-sp-bg-elev shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <h2 className="text-base font-extrabold text-sp-navy">Employer Terms &amp; Conditions</h2>
            <p className="text-xs text-sp-ink-3">SWAYAM Plus internship module</p>
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
          <div className="flex flex-col gap-5">
            {SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="mb-1 text-sm font-bold text-sp-navy">{section.heading}</h3>
                <p className="text-sm leading-relaxed text-sp-ink-2">{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-black/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-sp-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-sp-navy/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
