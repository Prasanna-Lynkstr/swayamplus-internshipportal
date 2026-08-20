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

  if (preferences.minExpectedStipend != null && meetsStipendFloor(internship, preferences.minExpectedStipend)) {
    score += 2;
  }

  return score;
}

// Same "at least X" semantics as the browse page's own stipend-floor filter
// (InternshipsService.findPublished's stipendMin query condition) — a
// listing clears the floor if either end of its range does, so a listing
// paying "up to ₹15,000" still counts against a ₹10,000 expectation.
function meetsStipendFloor(
  internship: Pick<Internship, 'stipendMin' | 'stipendMax'>,
  floor: number,
): boolean {
  return (internship.stipendMax ?? 0) >= floor || (internship.stipendMin ?? 0) >= floor;
}

// Same inputs and weights as scoreStudentMatch, but normalized to 0-100
// against only the dimensions that are actually set — an unset preference
// (or a listing with no skill tags at all) is excluded from the denominator
// rather than counted as a miss, so a student who's only set skills isn't
// penalized down to a low percentage just for never having filled in
// location/mode preferences. Mirrors the 0-100-or-null convention already
// used for the employer-side checklist match score (checklist-match.util.ts).
export function computeMatchPercent(
  studentSkills: string[],
  preferences: StudentPreference | null,
  internship: Pick<
    Internship,
    'skillTags' | 'category' | 'mode' | 'employmentType' | 'stipendMin' | 'stipendMax' | 'location'
  >,
): number | null {
  let earned = 0;
  let possible = 0;

  const addDimension = (isPreferenceSet: boolean, weight: number, isMatch: boolean) => {
    if (!isPreferenceSet) return;
    possible += weight;
    if (isMatch) earned += weight;
  };

  // Only counts if the student side actually has skills to compare — an
  // anonymous visitor or a real student who's never filled in skills has
  // nothing to score here, the same "excluded from the denominator, not
  // counted as a miss" rule every other dimension below follows. Partial
  // credit (not all-or-nothing like addDimension), so handled directly
  // rather than through it.
  if (studentSkills.length > 0) {
    possible += internship.skillTags.length;
    earned += matchedSkillTags(studentSkills, internship.skillTags).length;
  }

  if (preferences) {
    addDimension(
      preferences.preferredCategories.length > 0,
      3,
      preferences.preferredCategories.includes(internship.category),
    );
    addDimension(
      preferences.preferredModes.length > 0,
      2,
      preferences.preferredModes.includes(internship.mode),
    );
    addDimension(
      preferences.preferredEmploymentTypes.length > 0,
      2,
      preferences.preferredEmploymentTypes.includes(internship.employmentType),
    );
    const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
    addDimension(
      preferences.paidPreference !== 'either',
      2,
      (preferences.paidPreference === 'paid' && isPaid) ||
        (preferences.paidPreference === 'unpaid' && !isPaid),
    );
    addDimension(
      preferences.preferredLocations.length > 0,
      2,
      Boolean(
        internship.location &&
          preferences.preferredLocations.some((loc) =>
            internship.location!.toLowerCase().includes(loc.toLowerCase()),
          ),
      ),
    );
    addDimension(
      preferences.minExpectedStipend != null,
      2,
      preferences.minExpectedStipend != null && meetsStipendFloor(internship, preferences.minExpectedStipend),
    );
  }

  if (possible === 0) return null;
  return Math.round((earned / possible) * 100);
}

// Same case-insensitive comparison as the score above, but returns the
// actual overlapping tags (in the internship's own casing, since that's
// what's already rendered as chips on cards) so the UI can show *why* a
// listing/candidate matched instead of just a bare score.
export function matchedSkillTags(studentSkills: string[], internshipSkillTags: string[]): string[] {
  const studentSkillSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  return internshipSkillTags.filter((tag) => studentSkillSet.has(tag.toLowerCase()));
}
