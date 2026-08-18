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

// An Employer row only ever comes from EmployerEoiService.convert(), which
// copies every one of these fields straight from the approved EOI, so a
// freshly-converted employer is always complete. This mainly guards against
// a row left partial by a direct API call or manual data fix.
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
