import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryInterestRegistrationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
