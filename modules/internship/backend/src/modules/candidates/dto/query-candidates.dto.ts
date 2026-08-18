import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { toArray } from '../../../common/utils/query-array.util.js';

export type CandidatesSort = 'newest' | 'recent_activity';

// Query params for GET /candidates — the employer-facing mirror of
// QueryInternshipsDto: free-text search plus the same category/mode/
// employmentType multi-select shape (matched against the candidate's
// StudentPreference row instead of an Internship's own fields).
export class QueryCandidatesDto extends PaginationQueryDto {
  // Matches against fullName, collegeName, course, and skills.
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  category?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  mode?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  employmentType?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  // "Active in the last 7 days" — proxied as "applied to any internship in
  // the last 7 days", the only genuine activity signal this schema has (no
  // login/session tracking exists anywhere in it).
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsIn(['newest', 'recent_activity'])
  sort?: CandidatesSort;
}
