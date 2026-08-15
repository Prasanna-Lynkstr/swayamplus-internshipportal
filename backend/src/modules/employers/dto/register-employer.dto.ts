import { ArrayNotEmpty, Equals, IsArray, IsInt, IsString, IsUrl, Min } from 'class-validator';

// Every field here is required — the EOI form marks all of them mandatory
// (see EmployerProfileForm.tsx) so admin review always has a complete
// picture on the first submission, not a partial one to chase up later.
// Every decorator carries a plain-language `message` — class-validator's
// defaults ("cin must be a string") are accurate but read as raw technical
// output when several show up at once; the frontend already renders
// multiple messages as a clean list (see FormError.tsx), but the wording
// itself should read like something a person wrote, not a type-check log.
// UpdateEmployerDto (later edits) keeps every field optional, unchanged.
export class RegisterEmployerDto {
  @IsString({ message: 'Organization name is required.' })
  organizationName!: string;

  @IsString({ message: 'Contact person name is required.' })
  contactPersonName!: string;

  @IsString({ message: 'Contact person mobile number is required.' })
  contactPersonPhone!: string;

  @IsString({ message: 'Reason for expressing interest is required.' })
  reasonForEoi!: string;

  @IsString({ message: 'CIN is required.' })
  cin!: string;

  @IsInt({ message: 'Headcount must be a whole number.' })
  @Min(1, { message: 'Headcount must be at least 1.' })
  headcount!: number;

  @IsUrl({}, { message: 'LinkedIn business page must be a valid URL.' })
  linkedinBusinessPage!: string;

  // Validated against the active 'internship_category' taxonomy in
  // EmployersService, not a hardcoded @IsIn — see TaxonomiesService.
  @IsArray({ message: 'Select at least one internship type you expect to offer.' })
  @ArrayNotEmpty({ message: 'Select at least one internship type you expect to offer.' })
  @IsString({ each: true, message: 'Select at least one internship type you expect to offer.' })
  internshipTypesExpected!: string[];

  @IsUrl({}, { message: 'Website must be a valid URL.' })
  website!: string;

  @IsString({ message: 'HQ city is required.' })
  hqCity!: string;

  @IsArray({ message: 'Add at least one industry tag.' })
  @ArrayNotEmpty({ message: 'Add at least one industry tag.' })
  @IsString({ each: true, message: 'Add at least one industry tag.' })
  industryTags!: string[];

  // Hard gate, unlike the student profile's acceptTerms — EOI submission is
  // a one-shot action (no "save now, accept later" path the way a student's
  // multi-field profile has), so this is required and must be true.
  @Equals(true, { message: 'You must accept the Terms & Conditions to submit an EOI.' })
  acceptTerms!: boolean;
}
