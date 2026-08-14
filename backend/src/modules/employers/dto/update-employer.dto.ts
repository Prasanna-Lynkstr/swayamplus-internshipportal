import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { INTERNSHIP_CATEGORIES } from '../../../common/constants/categories.js';

export class UpdateEmployerDto {
  @IsOptional()
  @IsString()
  organizationName?: string;

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

  @IsOptional()
  @IsArray()
  @IsIn(INTERNSHIP_CATEGORIES, { each: true })
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
