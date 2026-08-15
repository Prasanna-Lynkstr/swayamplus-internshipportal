import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  collegeName?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  graduationYear?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  // resumeUrl is intentionally not settable here — it's only ever written by
  // POST /students/me/resume, which uploads the file via StorageService.

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @IsOptional()
  @IsUrl()
  mySkillsPlusUrl?: string;

  // Write-only signal, not a real column — StudentsService turns a `true`
  // here into a one-time `acceptedTermsAt` timestamp (never overwritten once
  // set). Omitting it or sending `false` is a no-op, not an error, since a
  // student may save other profile fields before ever reaching this checkbox.
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;
}
