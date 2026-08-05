import { User } from './user.model.js';
import { OtpCode } from './otp-code.model.js';
import { Student } from './student.model.js';
import { Employer } from './employer.model.js';
import { PlatformSetting } from './platform-setting.model.js';
import { Internship } from './internship.model.js';
import { InternshipApplication } from './internship-application.model.js';
import { InternshipRequest } from './internship-request.model.js';

export { User } from './user.model.js';
export type { UserRole } from './user.model.js';
export { OtpCode } from './otp-code.model.js';
export { Student } from './student.model.js';
export { Employer } from './employer.model.js';
export type { EmployerVerificationStatus } from './employer.model.js';
export { PlatformSetting } from './platform-setting.model.js';
export { Internship } from './internship.model.js';
export type { InternshipMode, InternshipStatus } from './internship.model.js';
export { InternshipApplication } from './internship-application.model.js';
export type { ApplicationStatus } from './internship-application.model.js';
export { InternshipRequest } from './internship-request.model.js';

export const MODELS = [
  User,
  OtpCode,
  Student,
  Employer,
  PlatformSetting,
  Internship,
  InternshipApplication,
  InternshipRequest,
] as const;
