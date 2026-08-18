'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: '1. Accuracy of your profile',
    body: (
      <>
        The name, education, contact details, resume, and skills you provide are shared with
        employers when you apply — misrepresenting your qualifications may get an application
        rejected, or your account suspended if it&apos;s a pattern rather than a one-off mistake.
      </>
    ),
  },
  {
    heading: '2. Free-of-cost platform',
    body: (
      <>
        Discovering and applying to internships on SWAYAM Plus is free. No employer or the
        platform itself may ever ask you for a fee, deposit, or payment — refundable or
        otherwise — as a condition of applying to, interviewing for, or receiving an offer for
        any internship listed here. Report any employer who asks.
      </>
    ),
  },
  {
    heading: '3. Use of your data',
    body: (
      <>
        Your profile and resume are shared with an employer only when you apply to one of their
        listings. That employer may use it only to evaluate you for that specific internship —
        not to sell, share, or reuse it for any other recruitment or marketing purpose without
        your explicit consent.
      </>
    ),
  },
  {
    heading: '4. Application conduct',
    body: (
      <>
        Cover notes and any self-rated checklist responses you submit with an application should
        honestly reflect your own experience. Withdrawing an application is final — you cannot
        reapply to the same listing afterward, so use it deliberately.
      </>
    ),
  },
  {
    heading: '5. Account review and suspension',
    body: (
      <>
        SWAYAM Plus admin may suspend or restrict an account at any time for a violation of these
        terms, a substantiated complaint from an employer, or if information provided at
        registration is later found to be false.
      </>
    ),
  },
  {
    heading: '6. Questions or grievances',
    body: (
      <>
        For questions about these terms, or to raise a concern about a listing or an employer on
        the platform, contact the SWAYAM Plus program team through the Ministry of Education
        portal.
      </>
    ),
  },
];

// Same portal/Escape/scroll-lock shell as EmployerEoiTermsModal — kept as a
// separate component (not a shared one parameterized by role) since the two
// audiences' terms are substantively different content, not a shared list
// with a few swapped words.
export function StudentTermsModal({ open, onClose }: Props) {
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
      aria-label="Student Terms & Conditions"
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
            <h2 className="text-base font-extrabold text-sp-navy">Student Terms &amp; Conditions</h2>
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
