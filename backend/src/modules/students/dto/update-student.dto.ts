import { IsArray, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

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
}
