'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Badge } from '@/components/ui/Badge';
import type { ApplicantProfile } from '@/lib/types';

const VALUE_LABEL: Record<string, string> = {
  limited: 'Limited',
  moderate: 'Moderate',
  expert: 'Expert',
  yes: 'Yes',
  no: 'No',
};

// Everything an employer needs to actually decide on one applicant — resume,
// photo, skills, education, preferences, and this specific application's
// cover note + checklist self-ratings (with notes) — not just the name and
// status badge the list row shows.
export function ApplicantProfilePanel({
  applicationId,
  token,
}: {
  applicationId: number;
  token: string | null;
}) {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<ApplicantProfile>(`/applications/${applicationId}/applicant-profile`, { token })
      .then(setProfile)
      .catch(() => setError("Could not load this applicant's profile."))
      .finally(() => setLoading(false));
  }, [applicationId, token]);

  if (loading) return <p className="p-3 text-sm text-sp-ink-3">Loading profile…</p>;
  if (error) return <p className="p-3 text-sm font-semibold text-sp-danger">{error}</p>;
  if (!profile) return null;

  const { student, preferences, application } = profile;
  const initial = (student.fullName ?? 'S').charAt(0).toUpperCase();

  const preferenceLines = preferences
    ? [
        preferences.preferredCategories.length > 0 && `Interested in: ${preferences.preferredCategories.join(', ')}`,
        preferences.preferredModes.length > 0 && `Mode: ${preferences.preferredModes.join(', ')}`,
        preferences.preferredEmploymentTypes.length > 0 &&
          `Type: ${preferences.preferredEmploymentTypes.join(', ')}`,
        preferences.preferredLocations.length > 0 && `Locations: ${preferences.preferredLocations.join(', ')}`,
        preferences.rolesOfInterest.length > 0 && `Roles: ${preferences.rolesOfInterest.join(', ')}`,
        `Paid preference: ${preferences.paidPreference}`,
        preferences.availabilityStatus && `Availability: ${preferences.availabilityStatus.replace(/_/g, ' ')}`,
        preferences.availableFrom && `Available from: ${preferences.availableFrom}`,
      ].filter(Boolean)
    : [];

  return (
    <div className="flex w-full flex-col gap-4 rounded-sp-lg bg-sp-bg-sunken p-4">
      <div className="flex items-center gap-3">
        {student.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
          <img
            src={resolveFileUrl(student.photoUrl)}
            alt={student.fullName ?? 'Applicant'}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-black text-sp-ink-2">
            {initial}
          </div>
        )}
        <div>
          <p className="font-bold text-sp-navy">{student.fullName ?? 'Unnamed student'}</p>
          <p className="text-xs text-sp-ink-3">
            {[student.course, student.graduationYear ? `Class of ${student.graduationYear}` : null, student.city]
              .filter(Boolean)
              .join(' · ') || 'No education details on file'}
          </p>
          <p className="text-xs text-sp-ink-3">{student.collegeName ?? 'No college on file'}</p>
        </div>
      </div>

      {student.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {student.skills.map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        {student.resumeUrl ? (
          <a
            href={resolveFileUrl(student.resumeUrl)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-sp-blue"
          >
            View resume
          </a>
        ) : (
          <span className="text-sp-ink-3">No resume on file</span>
        )}
        {student.linkedinUrl && (
          <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="font-semibold text-sp-blue">
            LinkedIn
          </a>
        )}
        {student.githubUrl && (
          <a href={student.githubUrl} target="_blank" rel="noreferrer" className="font-semibold text-sp-blue">
            GitHub
          </a>
        )}
        {student.mySkillsPlusUrl && (
          <a href={student.mySkillsPlusUrl} target="_blank" rel="noreferrer" className="font-semibold text-sp-blue">
            My Skills Plus
          </a>
        )}
      </div>

      {preferenceLines.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Stated preferences</p>
          <ul className="flex flex-col gap-0.5 text-sm text-sp-ink-2">
            {preferenceLines.map((line) => (
              <li key={line as string}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {application.coverNote && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Cover note</p>
          <p className="text-sm text-sp-ink-2">&ldquo;{application.coverNote}&rdquo;</p>
        </div>
      )}

      {application.checklistResponses.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
              Checklist responses
            </p>
            <Badge tone={application.recommended ? 'good' : 'neutral'}>
              {application.recommended
                ? `Recommended · ${application.matchScore}% match`
                : `${application.matchScore}% match`}
            </Badge>
          </div>
          <ul className="flex flex-col gap-2">
            {application.checklistResponses.map((r) => (
              <li key={r.item} className="text-sm text-sp-ink-2">
                <span className="font-semibold text-sp-navy">{VALUE_LABEL[r.value] ?? r.value}</span> — {r.item}
                {r.note && <p className="mt-0.5 text-xs italic text-sp-ink-3">&ldquo;{r.note}&rdquo;</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
