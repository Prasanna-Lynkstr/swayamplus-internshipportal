'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Badge } from '@/components/ui/Badge';
import { ContactRow, IconMail, IconPhone, LinkChip } from '@/components/ui/ContactLinks';
import type { Candidate } from '@/lib/types';

interface Props {
  candidateId: number | null;
  token: string | null;
  onClose: () => void;
}

const PAID_PREFERENCE_LABEL: Record<string, string> = {
  paid: 'Paid only',
  unpaid: 'Open to unpaid',
};

function availabilityLabel(candidate: Candidate): string | null {
  const { availabilityStatus, availableFrom } = candidate.preferences ?? {};
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

// Trims ApplicantProfileModal down to what's left once there's no
// application to review: same identity-rail + preferences layout, but no
// "This application" card, no Notes, and no status-action footer — this
// candidate may never have applied anywhere near this employer.
export function CandidateProfileModal({ candidateId, token, onClose }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (candidateId === null || !token) return;
    setCandidate(null);
    setLoading(true);
    setError('');
    apiFetch<Candidate>(`/candidates/${candidateId}`, { token })
      .then(setCandidate)
      .catch(() => setError('Could not load this candidate’s profile.'))
      .finally(() => setLoading(false));
  }, [candidateId, token]);

  useEffect(() => {
    if (candidateId === null) return;
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
  }, [candidateId, onClose]);

  if (candidateId === null || typeof document === 'undefined') return null;

  const initial = (candidate?.fullName ?? 'S').charAt(0).toUpperCase();
  const metaLine = candidate
    ? [
        candidate.course,
        candidate.graduationYear ? `Class of ${candidate.graduationYear}` : null,
        candidate.collegeName,
        candidate.city,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const availability = candidate ? availabilityLabel(candidate) : null;
  const preferences = candidate?.preferences;

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
      aria-label="Candidate profile"
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
        ) : loading || !candidate ? (
          <p className="p-10 text-center text-sm text-sp-ink-3">Loading…</p>
        ) : (
          <div className="grid flex-1 grid-cols-1 items-start overflow-y-auto lg:grid-cols-[290px_1fr] lg:divide-x lg:divide-black/5">
            <div className="flex flex-col gap-5 border-b border-black/5 bg-sp-bg-sunken/60 p-5 lg:border-b-0">
              <div className="flex flex-col items-center gap-2 rounded-sp-lg bg-sp-pastel-mint/60 p-5 text-center">
                {candidate.photoUrl ? (
                  <Image
                    src={resolveFileUrl(candidate.photoUrl)}
                    alt={candidate.fullName ?? 'Candidate'}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-black text-sp-ink-2">
                    {initial}
                  </div>
                )}
                <h2 className="text-base font-extrabold text-sp-navy">{candidate.fullName ?? 'Candidate profile'}</h2>
                {metaLine && <p className="text-xs text-sp-ink-3">{metaLine}</p>}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {candidate.score !== undefined && <Badge tone="good">Match score: {candidate.score}</Badge>}
                  {candidate.activeRecently && <Badge tone="orange">Active in last 7 days</Badge>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Contact</p>
                <ContactRow icon={<IconPhone />} value={candidate.phone} label="phone number" />
                <ContactRow icon={<IconMail />} value={candidate.user?.identifier} label="email" />
              </div>

              {candidate.skills.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Links</p>
                <div className="flex flex-wrap gap-1.5">
                  <LinkChip label="Resume" href={candidate.resumeUrl ? resolveFileUrl(candidate.resumeUrl) : null} accent />
                  <LinkChip label="LinkedIn" href={candidate.linkedinUrl} />
                  <LinkChip label="GitHub" href={candidate.githubUrl} />
                  <LinkChip label="My Skills Plus" href={candidate.mySkillsPlusUrl} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-5">
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
      </div>
    </div>,
    document.body,
  );
}
