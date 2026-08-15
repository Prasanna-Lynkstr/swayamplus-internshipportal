import type { Employer } from '../../database/models/index.js';

type EmployerProfileFields = Pick<
  Employer,
  | 'organizationName'
  | 'contactPersonName'
  | 'contactPersonPhone'
  | 'reasonForEoi'
  | 'cin'
  | 'headcount'
  | 'linkedinBusinessPage'
  | 'internshipTypesExpected'
  | 'website'
  | 'hqCity'
  | 'industryTags'
  | 'certificateOfIncorporationUrl'
  | 'acceptedTermsAt'
>;

// An Employer row is created empty at OTP verification (see AuthService.verifyOtp)
// so it always *exists* — this checks it's actually been filled in. Every
// field the EOI form collects is required (see RegisterEmployerDto and the
// form's own `required` attributes), so a fresh registration always leaves
// this complete — this mainly catches an employer row created before that
// was true, or a direct API call that bypassed the form.
//
// Returns which fields are missing (empty array = complete) rather than a
// bare boolean, so the UI can tell the user exactly what to fix instead of
// silently redirecting them with no explanation.
export function getMissingEmployerProfileFields(employer: EmployerProfileFields): string[] {
  const missing: string[] = [];
  if (!employer.organizationName) missing.push('Organization name');
  if (!employer.contactPersonName) missing.push('Contact person name');
  if (!employer.contactPersonPhone) missing.push('Contact person mobile number');
  if (!employer.reasonForEoi) missing.push('Reason for EOI');
  if (!employer.cin) missing.push('CIN');
  if (!employer.headcount) missing.push('Headcount');
  if (!employer.linkedinBusinessPage) missing.push('LinkedIn business page');
  if (employer.internshipTypesExpected.length === 0) missing.push('Internship types expected');
  if (!employer.website) missing.push('Website');
  if (!employer.hqCity) missing.push('HQ city');
  if (employer.industryTags.length === 0) missing.push('Industry tags');
  if (!employer.certificateOfIncorporationUrl) missing.push('Certificate of Incorporation');
  if (!employer.acceptedTermsAt) missing.push('Terms & Conditions acceptance');
  return missing;
}

export function isEmployerProfileComplete(employer: EmployerProfileFields): boolean {
  return getMissingEmployerProfileFields(employer).length === 0;
}
