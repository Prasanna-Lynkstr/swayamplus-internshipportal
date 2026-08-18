import { IsArray, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateEmployerDto {
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsString()
  contactPersonPhone?: string;

  @IsOptional()
  @IsString()
  reasonForEoi?: string;

  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;

  @IsOptional()
  @IsUrl()
  linkedinBusinessPage?: string;

  // Validated against the active 'internship_category' taxonomy in
  // EmployersService, not a hardcoded @IsIn — see TaxonomiesService.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  internshipTypesExpected?: string[];

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  hqCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryTags?: string[];
}
