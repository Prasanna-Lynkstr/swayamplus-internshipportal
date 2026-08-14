import { User } from './user.model.js';
import { OtpCode } from './otp-code.model.js';
import { Student } from './student.model.js';
import { StudentPreference } from './student-preference.model.js';
import { Employer } from './employer.model.js';
import { PlatformSetting } from './platform-setting.model.js';
import { Internship } from './internship.model.js';
import { InternshipApplication } from './internship-application.model.js';
import { ApplicationNote } from './application-note.model.js';
import { InternshipRequest } from './internship-request.model.js';
import { InterestRegistration } from './interest-registration.model.js';

export { User } from './user.model.js';
export type { UserRole } from './user.model.js';
export { OtpCode } from './otp-code.model.js';
export { Student } from './student.model.js';
export { StudentPreference } from './student-preference.model.js';
export type { PaidPreference } from './student-preference.model.js';
export { Employer } from './employer.model.js';
export type { EmployerVerificationStatus } from './employer.model.js';
export { PlatformSetting } from './platform-setting.model.js';
export { Internship } from './internship.model.js';
export type {
  InternshipMode,
  InternshipStatus,
  EmploymentType,
  ScheduleType,
} from './internship.model.js';
export { InternshipApplication } from './internship-application.model.js';
export type { ApplicationStatus } from './internship-application.model.js';
export { ApplicationNote } from './application-note.model.js';
export { InternshipRequest } from './internship-request.model.js';
export { InterestRegistration } from './interest-registration.model.js';

export const MODELS = [
  User,
  OtpCode,
  Student,
  StudentPreference,
  Employer,
  PlatformSetting,
  Internship,
  InternshipApplication,
  ApplicationNote,
  InternshipRequest,
  InterestRegistration,
] as const;
