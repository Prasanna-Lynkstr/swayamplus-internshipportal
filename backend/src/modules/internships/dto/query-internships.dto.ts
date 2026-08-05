import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { EmploymentType, InternshipMode } from '../../../database/models/index.js';
import { INTERNSHIP_CATEGORIES, type InternshipCategory } from '../../../common/constants/categories.js';

export type InternshipSort = 'newest' | 'stipend_high' | 'deadline_soon';

export class QueryInternshipsDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(INTERNSHIP_CATEGORIES)
  category?: InternshipCategory;

  @IsOptional()
  @IsIn(['remote', 'onsite', 'hybrid'])
  mode?: InternshipMode;

  @IsOptional()
  @IsIn(['full-time', 'part-time'])
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['newest', 'stipend_high', 'deadline_soon'])
  sort?: InternshipSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Ceiling is enforced in the service layer from MAX_PAGE_SIZE (config, not
  // a decorator literal) — only structural validation belongs here.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
