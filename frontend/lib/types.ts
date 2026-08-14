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
  user?: { identifier: string };
  /** Only present on the GET /students/me response. */
  profileComplete?: boolean;
  /** Only present on the GET /students/me response. */
  missingFields?: string[];
}

export type EmployerVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Employer {
  id: number;
  userId: number;
  organizationName: string | null;
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
  user?: { identifier: string };
  /** Only present on the GET /employers/me response. */
  profileComplete?: boolean;
  /** Only present on the GET /employers/me response. */
  missingFields?: string[];
}

export type PaidPreference = 'paid' | 'unpaid' | 'either';

export interface StudentPreferences {
  id: number;
  studentId: number;
  preferredCategories: string[];
  preferredLocations: string[];
  preferredModes: string[];
  preferredEmploymentTypes: string[];
  paidPreference: PaidPreference;
  rolesOfInterest: string[];
  availability: string | null;
}

export type InternshipMode = 'remote' | 'onsite' | 'hybrid';
export type InternshipStatus = 'draft' | 'published' | 'closed' | 'archived';
export type EmploymentType = 'full-time' | 'part-time';
export type ScheduleType = 'flexible' | 'fixed';

export interface Internship {
  id: number;
  employerId: number;
  title: string;
  description: string;
  skillTags: string[];
  category: string;
  mode: InternshipMode;
  employmentType: EmploymentType;
  location: string | null;
  durationWeeks: number;
  workingDays: number;
  scheduleType: ScheduleType;
  stipendMin: number | null;
  stipendMax: number | null;
  responsibilities: string[];
  perks: string[];
  eligibility: string[];
  checklistItems: string[];
  openings: number;
  applicationDeadline: string;
  status: InternshipStatus;
  createdAt: string;
  employer?: Employer;
  /** Present on GET /internships/:id and GET /internships/mine. */
  applicationsCount?: number;
}

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export interface ChecklistResponse {
  item: string;
  met: boolean;
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
}

export interface ApplicationNote {
  id: number;
  applicationId: number;
  authorUserId: number;
  note: string;
  createdAt: string;
  author?: { identifier: string; role: UserRole };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginatedInternships = PaginatedResult<Internship>;

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
  employers: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    newLast7Days: number;
  };
  internships: { total: number; draft: number; published: number; closed: number; archived: number };
  applications: { total: number };
  internshipRequests: { total: number };
  employerRegistrationOpen: boolean;
}

export interface EmployerDashboardStats {
  internships: { total: number; draft: number; published: number; closed: number; archived: number };
  applications: { total: number; pendingReview: number };
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

export interface InterestRegistration {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  areaOfInterest: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InternshipRequest {
  id: number;
  studentId: number;
  domain: string;
  notes: string | null;
  createdAt: string;
  student?: Student;
}
