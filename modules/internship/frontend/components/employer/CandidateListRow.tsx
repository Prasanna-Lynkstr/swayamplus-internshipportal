'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CopyButton, IconMail, IconPhone } from '@/components/ui/ContactLinks';
import { resolveFileUrl } from '@/lib/files';
import { CandidateProfileModal } from './CandidateProfileModal';
import type { Candidate } from '@/lib/types';

// The employer-facing mirror of InternshipListRow — a dense single-row
// result, but for a registered student rather than a listing. Self-contained
// modal state (one instance per row) rather than lifting it to the parent
// list, since nothing else on the page needs to know which row is open.
export function CandidateListRow({ candidate, token }: { candidate: Candidate; token: string | null }) {
  const [open, setOpen] = useState(false);
  const initial = (candidate.fullName ?? 'S').charAt(0).toUpperCase();
  // matchedSkills comes back in the internship's own tag casing, so compare
  // case-insensitively against the candidate's own skill strings.
  const matchedSkillSet = new Set((candidate.matchedSkills ?? []).map((s) => s.toLowerCase()));
  const metaLine = [
    candidate.course,
    candidate.graduationYear ? `Class of ${candidate.graduationYear}` : null,
    candidate.collegeName,
    candidate.city,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 gap-3">
          {candidate.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
            <img
              src={resolveFileUrl(candidate.photoUrl)}
              alt={candidate.fullName ?? 'Candidate'}
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sp-bg-sunken text-sm font-black text-sp-ink-2">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-sp-navy">{candidate.fullName ?? 'Unnamed student'}</h3>
              {candidate.score !== undefined && <Badge tone="good">Match score: {candidate.score}</Badge>}
              {candidate.activeRecently && <Badge tone="orange">Active in last 7 days</Badge>}
            </div>
            <p className="text-xs text-sp-ink-3">{metaLine || 'No profile details on file'}</p>

            {candidate.skills.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 6).map((skill) => {
                  const matched = matchedSkillSet.has(skill.toLowerCase());
                  return (
                    <span
                      key={skill}
                      className={
                        matched
                          ? 'rounded-full bg-sp-good-soft px-2.5 py-1 text-[11px] font-semibold text-sp-good'
                          : 'rounded-full bg-sp-bg-sunken px-2.5 py-1 text-[11px] font-semibold text-sp-ink-3'
                      }
                    >
                      {matched && '✓ '}
                      {skill}
                    </span>
                  );
                })}
                {candidate.skills.length > 6 && (
                  <span className="text-[11px] font-semibold text-sp-ink-3">
                    +{candidate.skills.length - 6} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {candidate.phone && (
                <span className="flex items-center gap-1">
                  <a
                    href={`tel:${candidate.phone}`}
                    className="flex items-center gap-1.5 font-semibold text-sp-navy hover:text-sp-blue"
                  >
                    <IconPhone /> {candidate.phone}
                  </a>
                  <CopyButton value={candidate.phone} label="phone number" />
                </span>
              )}
              {candidate.user?.identifier && (
                <span className="flex items-center gap-1">
                  <a
                    href={`mailto:${candidate.user.identifier}`}
                    className="flex items-center gap-1.5 font-semibold text-sp-navy hover:text-sp-blue"
                  >
                    <IconMail /> {candidate.user.identifier}
                  </a>
                  <CopyButton value={candidate.user.identifier} label="email" />
                </span>
              )}
              {candidate.resumeUrl && (
                <a
                  href={resolveFileUrl(candidate.resumeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sp-blue hover:underline"
                >
                  View resume
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-black/5 pt-3 sm:border-t-0 sm:pl-6 sm:pt-0">
          <Button onClick={() => setOpen(true)}>View profile</Button>
        </div>
      </Card>

      <CandidateProfileModal candidateId={open ? candidate.id : null} token={token} onClose={() => setOpen(false)} />
    </>
  );
}
