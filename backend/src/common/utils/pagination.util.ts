import type { ConfigService } from '@nestjs/config';
import type { PaginatedResult, PaginationQueryDto } from '../dto/pagination-query.dto.js';

/** Resolves { page, pageSize, offset } from a request's query + configured defaults/ceiling. */
export function resolvePagination(configService: ConfigService, query: PaginationQueryDto) {
  const defaultPageSize = configService.get<number>('DEFAULT_PAGE_SIZE', 12);
  const maxPageSize = configService.get<number>('MAX_PAGE_SIZE', 100);

  const page = query.page ?? 1;
  const pageSize = Math.min(Math.max(query.pageSize ?? defaultPageSize, 1), maxPageSize);

  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function toPaginatedResult<T>(
  rows: T[],
  count: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items: rows,
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}
