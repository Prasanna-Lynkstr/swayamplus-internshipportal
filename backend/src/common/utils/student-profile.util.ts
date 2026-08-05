import type { Student } from '../../database/models/index.js';

type StudentProfileFields = Pick<
  Student,
  'fullName' | 'phone' | 'collegeName' | 'course' | 'graduationYear' | 'city' | 'resumeUrl' | 'skills'
>;

// A Student row is created empty at OTP verification (see AuthService.verifyOtp)
// so it always *exists* — this checks it's actually been filled in. Required
// before a student may apply to an internship, since an incomplete profile
// (no name, no resume) leaves an employer with nothing to evaluate.
//
// Returns which fields are missing (empty array = complete) rather than a
// bare boolean, so the UI can tell the user exactly what to fix instead of
// silently redirecting them with no explanation.
export function getMissingStudentProfileFields(student: StudentProfileFields): string[] {
  const missing: string[] = [];
  if (!student.fullName) missing.push('Full name');
  if (!student.phone) missing.push('Phone');
  if (!student.collegeName) missing.push('College name');
  if (!student.course) missing.push('Course');
  if (!student.graduationYear) missing.push('Graduation year');
  if (!student.city) missing.push('City');
  if (!student.resumeUrl) missing.push('Resume');
  if (student.skills.length === 0) missing.push('At least one skill');
  return missing;
}

export function isStudentProfileComplete(student: StudentProfileFields): boolean {
  return getMissingStudentProfileFields(student).length === 0;
}
