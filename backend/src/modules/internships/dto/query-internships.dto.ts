import { IsIn, IsOptional, IsString } from 'class-validator';
import type { InternshipMode } from '../../../database/models/index.js';

export class QueryInternshipsDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsIn(['remote', 'onsite', 'hybrid'])
  mode?: InternshipMode;

  @IsOptional()
  @IsString()
  q?: string;
}
