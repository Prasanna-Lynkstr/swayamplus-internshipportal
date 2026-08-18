import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { toArray } from '../../../common/utils/query-array.util.js';

// Every filter below doubles as a marketing-segmentation input for
// GET /admin/students/export — kept on the same DTO as the paginated list
// (rather than a separate export-only DTO) so "what you're looking at" and
// "what you export" are always the exact same filtered set.
export class QueryAdminStudentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Matches against StudentPreference.preferredCategories, not the student's
  // own fields — a student has no direct "category" of their own.
  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  category?: string[];

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  graduationYearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  graduationYearMax?: number;

  // Deliberately not @Type(() => Boolean) — Boolean("false") is true in JS,
  // so that would make ?profileComplete=false behave identically to =true.
  // Must pass undefined through as-is (not coerce it to false) or
  // @IsOptional() stops actually being optional.
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  profileComplete?: boolean;

  // 'active' = applied to at least one internship within activityWindowDays;
  // 'dormant' = did not. Omitted = no activity filter at all.
  @IsOptional()
  @IsIn(['active', 'dormant'])
  activity?: 'active' | 'dormant';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activityWindowDays?: number;
}
