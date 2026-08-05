import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { InternshipMode } from '../../../database/models/index.js';

export class CreateInternshipDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTags?: string[];

  @IsString()
  domain!: string;

  @IsIn(['remote', 'onsite', 'hybrid'])
  mode!: InternshipMode;

  @IsOptional()
  @IsString()
  location?: string;

  @IsInt()
  @Min(1)
  durationWeeks!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stipendMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stipendMax?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  openings?: number;

  @IsISO8601()
  applicationDeadline!: string;
}
