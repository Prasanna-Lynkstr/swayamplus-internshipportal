'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { categoryIcon } from '@/lib/categories';
import { modeLabel } from '@/lib/mode';
import { INTERNSHIP_STATUS_TONE, internshipStatusLabel } from '@/lib/status-labels';
import type { Internship } from '@/lib/types';

interface Props {
  internship: Internship | null;
  onClose: () => void;
  onApprove: (internship: Internship) => void;
  onReject: (internship: Internship) => void;
  onTakeDown: (internship: Internship) => void;
}

function formatStipendRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unpaid';
  if (min && max && min !== max)
    return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')} / month`;
  return `₹${(min ?? max)?.toLocaleString('en-IN')} / month`;
}

function formatDuration(weeks: number): string {
  if (weeks % 4 === 0) {
    const months = weeks / 4;
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm text-sp-navy">{value || <span className="text-sp-ink-3">Not provided</span>}</dd>
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return <Field label={label} value={null} />;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </dd>
    </div>
  );
}

// Every field of the posting as the employer entered it — same purpose as
// EmployerEoiModal for EOIs — so an admin can moderate/take down against
// the full listing rather than the trimmed list-card summary.
export function InternshipDetailsModal({ internship, onClose, onApprove, onReject, onTakeDown }: Props) {
  useEffect(() => {
    if (!internship) return;
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
  }, [internship, onClose]);

  if (!internship || typeof document === 'undefined') return null;

  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
  const canTakeDown = internship.status === 'published' || internship.status === 'pending_review';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Internship details"
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
                Internship posting
              </h2>
              <Badge tone={INTERNSHIP_STATUS_TONE[internship.status]}>
                {internshipStatusLabel(internship.status)}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-sp-ink-3">
              Posted {new Date(internship.createdAt).toLocaleString()}
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
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Employer</p>
            <p className="mt-0.5 text-base font-extrabold text-sp-navy">
              {internship.employer?.organizationName ?? 'Unknown employer'}
            </p>
            {internship.employer?.verificationStatus && (
              <p className="mt-0.5 text-sm font-semibold text-sp-ink-2">
                Verification: {internship.employer.verificationStatus}
              </p>
            )}
          </div>

          <h3 className="text-lg font-bold text-sp-navy">{internship.title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-sp-ink-2">{internship.description}</p>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" value={`${categoryIcon(internship.category)} ${internship.category}`} />
            <Field label="Mode" value={modeLabel(internship.mode, 'full')} />
            <Field label="Employment type" value={internship.employmentType} />
            <Field label="Location" value={internship.location} />
            <Field label="Duration" value={formatDuration(internship.durationWeeks)} />
            <Field label="Working days" value={`${internship.workingDays} days · ${internship.scheduleType}`} />
            <Field
              label="Stipend"
              value={isPaid ? formatStipendRange(internship.stipendMin, internship.stipendMax) : 'Unpaid'}
            />
            <Field label="Openings" value={String(internship.openings)} />
            <Field
              label="Application deadline"
              value={new Date(internship.applicationDeadline).toLocaleDateString('en-IN')}
            />
            <Field label="Education level" value={internship.educationLevel} />
            <Field label="Stream" value={internship.stream} />
            <Field label="Experience required" value={internship.experienceRequired ? 'Yes' : 'No'} />
          </dl>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <List label="Skill tags" items={internship.skillTags} />
            <List label="Eligibility" items={internship.eligibility} />
            <List label="Responsibilities" items={internship.responsibilities} />
            <List label="Perks" items={internship.perks} />
          </div>

          {internship.checklistItems.length > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                Applicant checklist
              </dt>
              <dd className="mt-1.5 flex flex-col gap-1.5">
                {internship.checklistItems.map((c) => (
                  <div key={c.item} className="rounded-sp-md border border-black/5 px-3 py-2 text-sm text-sp-navy">
                    {c.item} <span className="text-sp-ink-3">({c.type})</span>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-black/5 px-6 py-4">
          {internship.status === 'pending_review' && (
            <>
              <Button variant="secondary" onClick={() => onReject(internship)}>
                Reject
              </Button>
              <Button onClick={() => onApprove(internship)}>Approve</Button>
            </>
          )}
          {canTakeDown && (
            <Button variant="secondary" onClick={() => onTakeDown(internship)}>
              Take down
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
