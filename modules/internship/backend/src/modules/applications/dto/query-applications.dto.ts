import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SORTS = ['recommended', 'newest', 'oldest'] as const;
export type ApplicationsSort = (typeof SORTS)[number];

const STATUSES = [
  'applied',
  'shortlisted',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn',
] as const;

// Query params for GET /internships/:id/applications — an employer reviewing
// 200+ applicants to one listing needs to filter/sort/search server-side
// rather than paging through everything by hand.
export class QueryApplicationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  recommended?: boolean;

  @IsOptional()
  @IsIn(SORTS)
  sort?: ApplicationsSort;

  // Free-text search against the applicant's name.
  @IsOptional()
  @IsString()
  q?: string;
}
