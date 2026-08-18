import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryAdminEmployersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  // Omitted = all employers, regardless of status.
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';
}
