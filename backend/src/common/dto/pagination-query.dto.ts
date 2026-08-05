import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shared by every paginated list endpoint. The upper bound on pageSize is
// enforced in each service from the configured MAX_PAGE_SIZE, not a
// decorator literal here — see internships.service.ts's resolvePageSize.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
