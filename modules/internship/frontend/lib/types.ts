export type UserRole = 'student' | 'employer' | 'admin';

export interface AuthUser {
  sub: number;
  identifier: string;
  role: UserRole;
}

export interface Student {
  id: number;
  userId: number;
  fullName: string | null;
  phone: string | null;
  collegeName: string | null;
  course: string | null;
  graduationYear: number | null;
  city: string | null;
  skills: string[];
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  mySkillsPlusUrl: string | null;
  photoUrl: string | null;
  acceptedTermsAt: string | null;
  /** Opt-out — true by default. When false, this student is hidden from the employer-facing candidate directory/recommended-candidates features. */
  discoverableToEmployers: boolean;
  createdAt: string;
  user?: { identifier: string };
  /** Only present on the GET /students/me response. */
  profileComplete?: boolean;
  /** Only present on the GET /students/me response. */
  missingFields?: string[];
}

export type EmployerVerificationStatus = 'pending' | 'approved' | 'rejected';
export type EmployerModerationMode = 'auto_publish' | 'review';

export interface Employer {
  id: number;
  userId: number;
  organizationName: string | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  reasonForEoi: string | null;
  cin: string | null;
  certificateOfIncorporationUrl: string | null;
  headcount: number | null;
  linkedinBusinessPage: string | null;
  internshipTypesExpected: string[];
  website: string | null;
  logoUrl: string | null;
  hqCity: string | null;
  industryTags: string[];
  verificationStatus: EmployerVerificationStatus;
  moderationMode: EmployerModerationMode;
  acceptedTermsAt: string | null;
  /** When this employer's EOI was submitted (row creation, not a distinct "submitted at" field). */
  createdAt: string;
  user?: { identifier: string };
  /** Only present on the GET /employers/me response. */
  profileComplete?: boolean;
  /** Only present on the GET /employers/me response. */
  missingFields?: string[];
}

export type EmployerEoiStatus = 'pending' | 'approved' | 'rejected';

// A public, pre-account submission — see docs' internships-landing-page +
// EOI-first-onboarding plan. Not an Employer: no userId exists until an
// admin approves it (EmployerEoiService.decide converts it into a real
// User + Employer pair).
export interface EmployerEoi {
  id: number;
  email: string;
  organizationName: string;
  contactPersonName: string;
  contactPersonPhone: string;
  reasonForEoi: string;
  cin: string;
  certificateOfIncorporationUrl: string;
  headcount: number;
  linkedinBusinessPage: string;
  website: string;
  hqCity: string;
  internshipTypesExpected: string[];
  industryTags: string[];
  acceptedTermsAt: string;
  status: EmployerEoiStatus;
  decidedAt: string | null;
  decidedByAdminUserId: number | null;
  convertedEmployerId: number | null;
  createdAt: string;
  /** Computed server-side on every list/update response — never trust a stale client copy before re-fetching. */
  emailInUse: boolean;
}

// GET /employers/:id/public — a narrow whitelist, not the full Employer shape.
// Only ever returned for an approved employer (see EmployersService.getPublicProfile).
export interface PublicEmployerProfile {
  id: number;
  organizationName: string | null;
  website: string | null;
  logoUrl: string | null;
  hqCity: string | null;
  industryTags: string[];
  headcount: number | null;
  internshipTypesExpected: string[];
  linkedinBusinessPage: string | null;
}

// paidPreference/mode/employmentType/scheduleType below are admin-managed
// taxonomy values (see lib/useTaxonomy.ts), not fixed unions — a plain
// string, validated server-side against the active taxonomy.
export type AvailabilityStatus = 'actively_looking' | 'not_looking' | 'available_from';

export interface StudentPreferences {
  id: number;
  studentId: number;
  preferredCategories: string[];
  preferredLocations: string[];
  preferredModes: string[];
  preferredEmploymentTypes: string[];
  paidPreference: string;
  rolesOfInterest: string[];
  availabilityStatus: AvailabilityStatus | null;
  // Only meaningful when availabilityStatus === 'available_from'.
  availableFrom: string | null;
}

export type InternshipStatus = 'draft' | 'pending_review' | 'published' | 'closed' | 'archived';
// 'Any' is a real, deliberate value an employer picks meaning "I don't care
// about this axis" — matched against every filter value on the discovery
// side (see InternshipsService.findPublished), not the same as null/unset.
export type EducationLevel = 'UG' | 'PG' | 'Other' | 'Any';
export type Stream =
  | 'Engineering'
  | 'Management'
  | 'Arts'
  | 'Commerce'
  | 'Science'
  | 'Law'
  | 'Medical'
  | 'Other'
  | 'Any';

export interface Internship {
  /** A random UUID, not the internal DB row id — see the backend's IDOR/enumeration review notes. */
  id: string;
  employerId: number;
  title: string;
  description: string;
  skillTags: string[];
  category: string;
  mode: string;
  employmentType: string;
  location: string | null;
  durationWeeks: number;
  workingDays: number;
  scheduleType: string;
  stipendMin: number | null;
  stipendMax: number | null;
  responsibilities: string[];
  perks: string[];
  eligibility: string[];
  educationLevel: EducationLevel | null;
  stream: Stream | null;
  experienceRequired: boolean;
  checklistItems: ChecklistItem[];
  openings: number;
  applicationDeadline: string;
  status: InternshipStatus;
  createdAt: string;
  employer?: Employer;
  /** Present on GET /internships/:id and GET /internships/mine. */
  applicationsCount?: number;
  /** Present on GET /internships/mine — applications still sitting at 'applied'. */
  pendingReviewCount?: number;
  /** Present on GET /internships/mine. */
  shortlistedCount?: number;
  /** Present on GET /internships/mine. */
  offeredCount?: number;
  /** Present on GET /internships when the requester is an authenticated student. */
  appliedByCurrentUser?: boolean;
  /** Present on GET /internships — true when this employer has 2+ currently-published internships. */
  activelyHiring?: boolean;
}

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

// A 'rating' item asks the student to self-rate (limited/moderate/expert);
// a 'yesno' item is a plain confirmation question (e.g. "Can you work 6
// days a week?") that doesn't fit a skill-level scale. Set per item by the
// employer — see components/employer/InternshipForm.tsx.
export type ChecklistItemType = 'rating' | 'yesno';

export interface ChecklistItem {
  item: string;
  type: ChecklistItemType;
}

// Matches the product spec's original limited/moderate/expert scale — see
// backend/src/database/models/internship-application.model.ts.
export type ChecklistResponseLevel = 'limited' | 'moderate' | 'expert';
export type ChecklistAnswer = 'yes' | 'no';

export interface ChecklistResponse {
  item: string;
  type: ChecklistItemType;
  value: ChecklistResponseLevel | ChecklistAnswer;
  note?: string | null;
}

export interface InternshipApplication {
  id: number;
  internshipId: number;
  studentId: number;
  coverNote: string | null;
  checklistResponses: ChecklistResponse[];
  status: ApplicationStatus;
  createdAt: string;
  internship?: Internship;
  student?: Student;
  /** Present on GET /internships/:id/applications — 0-100, or null with no checklist responses. */
  matchScore?: number | null;
  /** Present on GET /internships/:id/applications — matchScore >= 70. */
  recommended?: boolean;
}

export interface ApplicationNote {
  id: number;
  applicationId: number;
  authorUserId: number;
  note: string;
  createdAt: string;
  author?: { identifier: string; role: UserRole };
}

// GET /applications/:id/applicant-profile — everything an employer needs to
// evaluate one applicant, bundled in one call.
export interface ApplicantProfile {
  student: Student;
  preferences: StudentPreferences | null;
  application: {
    id: number;
    coverNote: string | null;
    checklistResponses: ChecklistResponse[];
    status: ApplicationStatus;
    createdAt: string;
    matchScore: number | null;
    recommended: boolean;
  };
}

// GET /candidates, GET /candidates/:id, GET /internships/:id/recommended-candidates
// — the employer-facing mirror of ApplicantProfile, but for a student who
// may never have applied anywhere near this employer. user.identifier is
// the student's email (see USER_SAFE_ATTRIBUTES on the backend).
export interface Candidate extends Student {
  /** Applied to any internship in the last 7 days — the only genuine activity signal this schema has. */
  activeRecently: boolean;
  preferences: StudentPreferences | null;
  /** Present only on GET /internships/:id/recommended-candidates — this candidate's match score against that specific listing. */
  score?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginatedInternships = PaginatedResult<Internship>;
export type PaginatedCandidates = PaginatedResult<Candidate>;

export interface SavedSearch {
  id: number;
  studentId: number;
  filters: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface PlatformSettings {
  employerRegistrationOpen: boolean;
  autoApproveEmployers: boolean;
  emailNotificationsEnabled: boolean;
}

export interface AdminDashboardStats {
  students: { total: number; newLast7Days: number };
  employers: { total: number; newLast7Days: number };
  employerEois: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  internships: {
    total: number;
    draft: number;
    pending_review: number;
    published: number;
    closed: number;
    archived: number;
  };
  applications: { total: number };
  internshipRequests: { total: number };
  employerRegistrationOpen: boolean;
}

// GET /admin/dashboard/timeline?from=&to= — one entry per bucket start
// (bucketed at `granularity`, auto-picked server-side from the requested
// span), each series array the same length/order as `buckets`.
export interface DashboardTimeline {
  granularity: 'day' | 'week' | 'month';
  buckets: string[];
  series: {
    studentsCreated: number[];
    employersRegistered: number[];
    internshipsPosted: number[];
    internshipsOffered: number[];
  };
}

// GET /admin/dashboard/growth — "active"/"dormant" are measured strictly by
// posting activity (employers) and application activity (students); there
// is no login/session timestamp anywhere in this schema.
export interface AdminGrowthInsights {
  employerEngagement: {
    postedLast30Days: number;
    dormant: number;
    topPosters: Array<{
      employerId: number;
      organizationName: string;
      internshipCount: number;
      lastPostedAt: string;
    }>;
  };
  studentEngagement: {
    appliedLast30Days: number;
    dormant: number;
  };
  matchQuality: {
    publishedInternships: number;
    internshipsWithZeroApplications: number;
    avgApplicationsPerInternship: number;
    offerRate: number;
  };
  unmetDemand: Array<{ domain: string; requestCount: number }>;
}

export interface EmployerDashboardStats {
  internships: {
    total: number;
    draft: number;
    pending_review: number;
    published: number;
    closed: number;
    archived: number;
  };
  applications: {
    total: number;
    pendingReview: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    rejected: number;
    withdrawn: number;
  };
  verificationStatus: EmployerVerificationStatus;
}

export interface StudentDashboardStats {
  applications: {
    total: number;
    applied: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    rejected: number;
    withdrawn: number;
  };
}

export interface InternshipRequest {
  id: number;
  studentId: number;
  domain: string;
  notes: string | null;
  createdAt: string;
  student?: Student;
}

// GET /platform-stats — public, coarse counts only, no PII. Feeds the
// employer marketing landing page's trust metrics.
export interface PlatformStats {
  studentsRegistered: number;
  employersVerified: number;
  internshipsPosted: number;
  internshipsOffered: number;
}
