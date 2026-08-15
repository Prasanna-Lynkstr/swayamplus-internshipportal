import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const STATUSES = ['draft', 'pending_review', 'published', 'closed', 'archived'] as const;

// Query params for GET /internships/mine — an employer with 50+ postings
// needs to search/filter rather than scroll a flat list.
export class QueryMineInternshipsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
