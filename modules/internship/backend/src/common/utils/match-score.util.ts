import type { Internship, StudentPreference } from '../../database/models/index.js';

// Symmetric relevance score between a student (skills + preferences) and an
// internship listing — the same weights work for ranking listings for a
// student (InternshipsService.findPublished) and for ranking candidate
// students against one listing (CandidatesService). availabilityStatus/
// availableFrom are deliberately excluded — they describe the student's own
// timeline, not a listing property. rolesOfInterest is also excluded — it's
// free text with no reliable listing-side field to compare against, and a
// fuzzy substring match against title would produce weak, hard-to-explain
// results. Weights below are a reasonable starting point, not empirically
// tuned. Computed in application code rather than SQL — at this codebase's
// actual scale, sorting an already-filtered result set in memory is simpler
// and safer than a raw jsonb query; revisit if real volume ever makes that
// fetch large.
export function scoreStudentMatch(
  studentSkills: string[],
  preferences: StudentPreference | null,
  internship: Pick<
    Internship,
    'skillTags' | 'category' | 'mode' | 'employmentType' | 'stipendMin' | 'stipendMax' | 'location'
  >,
): number {
  const studentSkillSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  let score = internship.skillTags.filter((tag) => studentSkillSet.has(tag.toLowerCase())).length;

  if (!preferences) return score;

  if (preferences.preferredCategories.includes(internship.category)) score += 3;
  if (preferences.preferredModes.includes(internship.mode)) score += 2;
  if (preferences.preferredEmploymentTypes.includes(internship.employmentType)) score += 2;

  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
  if (
    (preferences.paidPreference === 'paid' && isPaid) ||
    (preferences.paidPreference === 'unpaid' && !isPaid)
  ) {
    score += 2;
  }

  if (
    internship.location &&
    preferences.preferredLocations.some((loc) =>
      internship.location!.toLowerCase().includes(loc.toLowerCase()),
    )
  ) {
    score += 2;
  }

  return score;
}

// Same case-insensitive comparison as the score above, but returns the
// actual overlapping tags (in the internship's own casing, since that's
// what's already rendered as chips on cards) so the UI can show *why* a
// listing/candidate matched instead of just a bare score.
export function matchedSkillTags(studentSkills: string[], internshipSkillTags: string[]): string[] {
  const studentSkillSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  return internshipSkillTags.filter((tag) => studentSkillSet.has(tag.toLowerCase()));
}
