import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryEmployerEoiDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  // Omitted = all submissions, regardless of status — same convention as
  // QueryAdminEmployersDto.
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';
}
