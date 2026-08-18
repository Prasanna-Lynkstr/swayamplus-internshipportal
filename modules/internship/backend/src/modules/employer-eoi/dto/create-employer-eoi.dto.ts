import { ArrayNotEmpty, Equals, IsArray, IsEmail, IsInt, IsString, IsUrl, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// Multipart form fields arrive as strings — array fields are sent
// JSON-stringified by the frontend (see the EOI form's submit handler) and
// parsed back here before validation. A malformed value fails the
// `@IsArray` check right after, rather than throwing an uncaught parse
// error inside the pipe.
function parseJsonArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// The only path to a new employer account — required-everything, plus
// `email`, since there's no OTP-issued identity yet to hang this submission
// off of.
export class CreateEmployerEoiDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  email!: string;

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

  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Headcount must be a whole number.' })
  @Min(1, { message: 'Headcount must be at least 1.' })
  headcount!: number;

  @IsUrl({}, { message: 'LinkedIn business page must be a valid URL.' })
  linkedinBusinessPage!: string;

  @Transform(parseJsonArray)
  @IsArray({ message: 'Select at least one internship type you expect to offer.' })
  @ArrayNotEmpty({ message: 'Select at least one internship type you expect to offer.' })
  @IsString({ each: true, message: 'Select at least one internship type you expect to offer.' })
  internshipTypesExpected!: string[];

  @IsUrl({}, { message: 'Website must be a valid URL.' })
  website!: string;

  @IsString({ message: 'HQ city is required.' })
  hqCity!: string;

  @Transform(parseJsonArray)
  @IsArray({ message: 'Add at least one industry tag.' })
  @ArrayNotEmpty({ message: 'Add at least one industry tag.' })
  @IsString({ each: true, message: 'Add at least one industry tag.' })
  industryTags!: string[];

  // Hard gate — a one-shot public submission, no "accept later" path.
  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, { message: 'You must accept the Terms & Conditions to submit an EOI.' })
  acceptTerms!: boolean;
}
