import type {
  ChecklistAnswer,
  ChecklistResponseLevel,
} from '../../database/models/internship-application.model.js';

const RATING_SCORE: Record<ChecklistResponseLevel, number> = {
  limited: 0.2,
  moderate: 0.6,
  expert: 1,
};

const YESNO_SCORE: Record<ChecklistAnswer, number> = { yes: 1, no: 0 };

const RECOMMENDED_THRESHOLD = 0.7;

export interface ChecklistMatch {
  /** 0-100, or null when the application carries no checklist responses to score. */
  matchScore: number | null;
  recommended: boolean;
}

// Read-time only — deliberately not persisted on the application row. A
// student's checklist answers never change after applying, but the
// scoring weights below might, and a stored value would silently go stale
// the moment they did.
export function computeChecklistMatch(
  responses: Array<{ type: 'rating' | 'yesno'; value: string }>,
): ChecklistMatch {
  if (!responses || responses.length === 0) {
    return { matchScore: null, recommended: false };
  }

  const scores = responses.map((r) =>
    r.type === 'yesno'
      ? (YESNO_SCORE[r.value as ChecklistAnswer] ?? 0)
      : (RATING_SCORE[r.value as ChecklistResponseLevel] ?? 0),
  );
  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return {
    matchScore: Math.round(average * 100),
    recommended: average >= RECOMMENDED_THRESHOLD,
  };
}
