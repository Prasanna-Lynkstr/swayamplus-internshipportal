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
}

export type EmployerVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Employer {
  id: number;
  userId: number;
  organizationName: string | null;
  cin: string | null;
  gst: string | null;
  website: string | null;
  logoUrl: string | null;
  hqCity: string | null;
  industryTags: string[];
  verificationDocumentUrl: string | null;
  verificationStatus: EmployerVerificationStatus;
  user?: { identifier: string };
}

export type InternshipMode = 'remote' | 'onsite' | 'hybrid';
export type InternshipStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface Internship {
  id: number;
  employerId: number;
  title: string;
  description: string;
  skillTags: string[];
  domain: string;
  mode: InternshipMode;
  location: string | null;
  durationWeeks: number;
  stipendMin: number | null;
  stipendMax: number | null;
  openings: number;
  applicationDeadline: string;
  status: InternshipStatus;
  createdAt: string;
  employer?: Employer;
}

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export interface InternshipApplication {
  id: number;
  internshipId: number;
  studentId: number;
  coverNote: string | null;
  status: ApplicationStatus;
  createdAt: string;
  internship?: Internship;
  student?: Student;
}

export interface PlatformSettings {
  employerRegistrationOpen: boolean;
  autoApproveEmployers: boolean;
}

export interface InternshipRequest {
  id: number;
  studentId: number;
  domain: string;
  notes: string | null;
  createdAt: string;
  student?: Student;
}
