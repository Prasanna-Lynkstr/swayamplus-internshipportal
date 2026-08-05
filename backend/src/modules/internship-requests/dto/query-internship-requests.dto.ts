import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryInternshipRequestsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
