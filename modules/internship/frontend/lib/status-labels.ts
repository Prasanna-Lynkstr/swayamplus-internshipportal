import type { ApplicationStatus, EmployerVerificationStatus, InternshipStatus } from './types';

type StatusTone = 'orange' | 'good' | 'danger' | 'neutral';

// Single source for every status-enum's Badge tone + display label, used
// across applications/page.tsx, student/dashboard, employer/dashboard,
// admin/employers, admin/internships, and employer/profile — previously
// six copy-pasted maps that could (and did) drift out of sync.
export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  applied: 'neutral',
  shortlisted: 'orange',
  interviewing: 'orange',
  offered: 'good',
  rejected: 'danger',
  withdrawn: 'neutral',
};

export const INTERNSHIP_STATUS_TONE: Record<InternshipStatus, StatusTone> = {
  draft: 'neutral',
  pending_review: 'orange',
  published: 'good',
  closed: 'danger',
  archived: 'neutral',
};

// Only statuses whose enum value isn't already display-ready need an entry
// here — everything else falls through to the raw value in internshipStatusLabel.
const INTERNSHIP_STATUS_LABEL: Partial<Record<InternshipStatus, string>> = {
  pending_review: 'pending review',
};

export function internshipStatusLabel(status: InternshipStatus): string {
  return INTERNSHIP_STATUS_LABEL[status] ?? status;
}

export const EMPLOYER_VERIFICATION_STATUS_TONE: Record<EmployerVerificationStatus, StatusTone> = {
  pending: 'orange',
  approved: 'good',
  rejected: 'danger',
};

// A left-border accent for status-carrying row cards (admin employer/internship
// lists, employer dashboard postings, application lists) — the same tone the
// row's status Badge uses, so a stack of otherwise-identical white cards reads
// as differentiated by status at a glance instead of a flat, undifferentiated
// list.
export const STATUS_TONE_BORDER: Record<StatusTone, string> = {
  orange: 'border-l-4 border-l-sp-orange',
  good: 'border-l-4 border-l-sp-good',
  danger: 'border-l-4 border-l-sp-danger',
  neutral: 'border-l-4 border-l-black/10',
};
