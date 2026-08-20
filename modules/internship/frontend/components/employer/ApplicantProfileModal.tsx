'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ContactRow, IconMail, IconPhone, LinkChip } from '@/components/ui/ContactLinks';
import { ApplicantNotes } from './ApplicantNotes';
import { APPLICATION_STATUS_TONE } from '@/lib/status-labels';
import type { ApplicantProfile, ApplicationStatus } from '@/lib/types';

interface Props {
  applicationId: number | null;
  token: string | null;
  onClose: () => void;
  /** Fired when the employer picks a status from inside this modal — the
   * parent owns the actual API call (and, for 'rejected', a confirmation
   * step) so this component stays a viewer + request-only, same division
   * of responsibility as every other decision modal in this codebase. */
  onRequestStatusChange: (applicationId: number, status: ApplicationStatus) => void;
}

const STATUS_ACTIONS: Array<{ status: ApplicationStatus; label: string; danger?: boolean }> = [
  { status: 'shortlisted', label: 'Shortlist' },
  { status: 'interviewing', label: 'Interviewing' },
  { status: 'offered', label: 'Offer' },
  { status: 'rejected', label: 'Reject', danger: true },
];

// Same "scorecard" idiom as the codebase's own compliance/audit tables — a
// scannable row per item with a colored verdict pill, not a bullet of prose
// — applied here to the one thing on this screen that's actually structured
// data: the student's self-ratings against the employer's own checklist.
const CHECKLIST_VALUE: Record<string, { label: string; tone: 'good' | 'orange' | 'neutral' | 'danger' }> = {
  expert: { label: 'Expert', tone: 'good' },
  moderate: { label: 'Moderate', tone: 'orange' },
  limited: { label: 'Limited', tone: 'neutral' },
  yes: { label: 'Yes', tone: 'good' },
  no: { label: 'No', tone: 'danger' },
};

const PAID_PREFERENCE_LABEL: Record<string, string> = {
  paid: 'Paid only',
  unpaid: 'Open to unpaid',
};

function availabilityLabel(profile: ApplicantProfile): string | null {
  const { availabilityStatus, availableFrom } = profile.preferences ?? {};
  if (!availabilityStatus) return null;
  if (availabilityStatus === 'available_from' && availableFrom) {
    return `Available from ${new Date(availableFrom).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }
  return availabilityStatus.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}


// The full profile behind one application — everything the student entered
// while completing their profile, plus this specific application's cover
// note and checklist self-ratings. Laid out as two columns (identity/contact
// on the left, the decision-relevant content — this application, then
// preferences — on the right) specifically so the common case fits in one
// view: the old single-column stack of labeled dt/dd pairs needed a scroll
// for almost every profile, most of it spent re-stating the course/college/
// city that the header already shows. An unusually long cover note or a full
// checklist can still exceed 90vh, so the body keeps a scroll fallback
// rather than clipping content outright.
export function ApplicantProfileModal({ applicationId, token, onClose, onRequestStatusChange }: Props) {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (applicationId === null || !token) return;
    setProfile(null);
    setLoading(true);
    setError('');
    apiFetch<ApplicantProfile>(`/applications/${applicationId}/applicant-profile`, { token })
      .then(setProfile)
      .catch(() => setError("Could not load this applicant's profile."))
      .finally(() => setLoading(false));
  }, [applicationId, token]);

  useEffect(() => {
    if (applicationId === null) return;
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
  }, [applicationId, onClose]);

  if (applicationId === null || typeof document === 'undefined') return null;

  const student = profile?.student;
  const preferences = profile?.preferences;
  const application = profile?.application;
  const initial = (student?.fullName ?? 'S').charAt(0).toUpperCase();
  const metaLine = student
    ? [
        student.course,
        student.graduationYear ? `Class of ${student.graduationYear}` : null,
        student.collegeName,
        student.city,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const availability = profile ? availabilityLabel(profile) : null;

  // Only meaningfully-set preferences get a row — 'either' is the unset
  // default every student starts with (see StudentPreference model), not a
  // real signal, and an empty array reads as "never touched," not "empty on
  // purpose." Keeps the common case (nobody filled preferences in) down to
  // one line instead of seven mostly-empty ones.
  const preferenceRows: Array<{ label: string; value: string }> = preferences
    ? (
        [
          preferences.preferredCategories.length > 0 && {
            label: 'Interested in',
            value: preferences.preferredCategories.join(', '),
          },
          preferences.rolesOfInterest.length > 0 && {
            label: 'Roles',
            value: preferences.rolesOfInterest.join(', '),
          },
          preferences.preferredModes.length > 0 && { label: 'Mode', value: preferences.preferredModes.join(', ') },
          preferences.preferredEmploymentTypes.length > 0 && {
            label: 'Type',
            value: preferences.preferredEmploymentTypes.join(', '),
          },
          preferences.preferredLocations.length > 0 && {
            label: 'Locations',
            value: preferences.preferredLocations.join(', '),
          },
          preferences.paidPreference !== 'either' && {
            label: 'Pay',
            value: PAID_PREFERENCE_LABEL[preferences.paidPreference] ?? preferences.paidPreference,
          },
          availability && { label: 'Availability', value: availability },
        ] as const
      ).filter((row): row is { label: string; value: string } => Boolean(row))
    : [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Applicant profile"
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

        {error ? (
          <p className="p-10 text-center text-sm font-semibold text-sp-danger">{error}</p>
        ) : loading || !profile || !student ? (
          <p className="p-10 text-center text-sm text-sp-ink-3">Loading…</p>
        ) : (
          <div className="grid flex-1 grid-cols-1 items-start overflow-y-auto lg:grid-cols-[290px_1fr] lg:divide-x lg:divide-black/5">
            {/* Identity rail */}
            <div className="flex flex-col gap-5 border-b border-black/5 bg-sp-bg-sunken/60 p-5 lg:border-b-0">
              <div className="flex flex-col items-center gap-2 rounded-sp-lg bg-sp-pastel-mint/60 p-5 text-center">
                {student.photoUrl ? (
                  <Image
                    src={resolveFileUrl(student.photoUrl)}
                    alt={student.fullName ?? 'Applicant'}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-black text-sp-ink-2">
                    {initial}
                  </div>
                )}
                <h2 className="text-base font-extrabold text-sp-navy">{student.fullName ?? 'Applicant profile'}</h2>
                {metaLine && <p className="text-xs text-sp-ink-3">{metaLine}</p>}
                {application && application.matchScore != null && (
                  <Badge tone={application.recommended ? 'good' : 'neutral'}>
                    {application.recommended
                      ? `Recommended · ${application.matchScore}%`
                      : `${application.matchScore}% match`}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Contact</p>
                <ContactRow icon={<IconPhone />} value={student.phone} label="phone number" />
                <ContactRow icon={<IconMail />} value={student.user?.identifier} label="email" />
              </div>

              {student.skills.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {student.skills.map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Links</p>
                <div className="flex flex-wrap gap-1.5">
                  <LinkChip label="Resume" href={student.resumeUrl ? resolveFileUrl(student.resumeUrl) : null} accent />
                  <LinkChip label="LinkedIn" href={student.linkedinUrl} />
                  <LinkChip label="GitHub" href={student.githubUrl} />
                  <LinkChip label="My Skills Plus" href={student.mySkillsPlusUrl} />
                </div>
              </div>
            </div>

            {/* Decision-relevant content */}
            <div className="flex flex-col gap-5 p-5">
              {application && (application.coverNote || application.checklistResponses.length > 0) && (
                <div className="rounded-sp-md bg-sp-pastel-lavender p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">This application</p>
                  {application.coverNote && (
                    <p className="text-sm text-sp-ink-2">&ldquo;{application.coverNote}&rdquo;</p>
                  )}
                  {application.checklistResponses.length > 0 && (
                    <div className={`overflow-x-auto ${application.coverNote ? 'mt-3' : ''}`}>
                      <table className="w-full min-w-[380px] border-collapse text-sm">
                        <thead>
                          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-sp-ink-3">
                            <th className="pb-1.5 pr-3 font-bold">Checklist item</th>
                            <th className="w-28 pb-1.5 pr-3 font-bold">Self-rating</th>
                            <th className="pb-1.5 font-bold">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {application.checklistResponses.map((r) => {
                            const rating = CHECKLIST_VALUE[r.value] ?? { label: r.value, tone: 'neutral' as const };
                            return (
                              <tr key={r.item} className="border-t border-black/10 align-top">
                                <td className="py-1.5 pr-3 text-sp-navy">{r.item}</td>
                                <td className="py-1.5 pr-3">
                                  <Badge tone={rating.tone}>{rating.label}</Badge>
                                </td>
                                <td className="py-1.5 text-sp-ink-3 italic">{r.note ? `“${r.note}”` : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-sp-md bg-sp-bg-sunken p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                  Notes — visible to your team only
                </p>
                <ApplicantNotes applicationId={application!.id} token={token} />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Preferences</p>
                {preferenceRows.length === 0 ? (
                  <p className="text-sm text-sp-ink-3">No preferences set.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {preferenceRows.map((row) => (
                      <p key={row.label} className="text-sm text-sp-ink-2">
                        <span className="font-semibold text-sp-navy">{row.label}:</span> {row.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {application && application.status !== 'withdrawn' && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-black/5 bg-sp-bg-elev px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
              Status: <Badge tone={APPLICATION_STATUS_TONE[application.status]}>{application.status}</Badge>
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map((action) => (
                <Button
                  key={action.status}
                  variant="secondary"
                  disabled={application.status === action.status}
                  className={
                    action.danger
                      ? 'border-sp-danger/40 text-sp-danger hover:border-sp-danger/70 hover:bg-sp-danger-soft'
                      : undefined
                  }
                  onClick={() => onRequestStatusChange(application.id, action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
