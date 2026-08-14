import type { Employer } from '../../database/models/index.js';

type EmployerProfileFields = Pick<
  Employer,
  'organizationName' | 'reasonForEoi' | 'certificateOfIncorporationUrl'
>;

// An Employer row is created empty at OTP verification (see AuthService.verifyOtp)
// so it always *exists* — this checks it's actually been filled in. Only the
// fields the EOI form requires for admin review are required here (org name,
// reason for EOI, and the Certificate of Incorporation itself) — cin/headcount/
// linkedinBusinessPage/internshipTypesExpected/website/hqCity/industryTags stay
// genuinely optional, matching the registration form's own `required` attributes.
//
// Returns which fields are missing (empty array = complete) rather than a
// bare boolean, so the UI can tell the user exactly what to fix instead of
// silently redirecting them with no explanation.
export function getMissingEmployerProfileFields(employer: EmployerProfileFields): string[] {
  const missing: string[] = [];
  if (!employer.organizationName) missing.push('Organization name');
  if (!employer.reasonForEoi) missing.push('Reason for EOI');
  if (!employer.certificateOfIncorporationUrl) missing.push('Certificate of Incorporation');
  return missing;
}

export function isEmployerProfileComplete(employer: EmployerProfileFields): boolean {
  return getMissingEmployerProfileFields(employer).length === 0;
}
