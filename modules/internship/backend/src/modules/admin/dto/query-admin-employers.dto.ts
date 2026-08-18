import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { toArray } from '../../../common/utils/query-array.util.js';

// Every filter below doubles as a marketing-segmentation input for
// GET /admin/employers/export — see the matching comment on
// QueryAdminStudentsDto for why this isn't a separate export-only DTO.
export class QueryAdminEmployersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  // Omitted = all employers, regardless of status.
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  hqCity?: string;

  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  industryTags?: string[];

  // never_posted: zero internships ever. zero_applicants: has postings, but
  // none have received a single application. actively_hiring: 2+ currently
  // published listings (same bar InternshipsService uses for the public
  // "actively hiring" badge). dormant: has posted before, but nothing new
  // within activityWindowDays.
  @IsOptional()
  @IsIn(['never_posted', 'zero_applicants', 'actively_hiring', 'dormant'])
  activation?: 'never_posted' | 'zero_applicants' | 'actively_hiring' | 'dormant';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activityWindowDays?: number;
}
