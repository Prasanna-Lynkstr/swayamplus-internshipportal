import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import type { InternshipStatus } from '../../../database/models/internship.model.js';

export class QueryAdminInternshipsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['draft', 'published', 'closed', 'archived'])
  status?: InternshipStatus;

  @IsOptional()
  @IsString()
  q?: string;
}
