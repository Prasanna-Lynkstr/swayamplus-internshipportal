import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { EmploymentType, InternshipMode, ScheduleType } from '../../../database/models/index.js';
import { INTERNSHIP_CATEGORIES, type InternshipCategory } from '../../../common/constants/categories.js';
import { MaxDaysFromNow } from '../../../common/decorators/max-days-from-now.decorator.js';

const MAX_DEADLINE_DAYS_OUT = 90;

export class CreateInternshipDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTags?: string[];

  @IsIn(INTERNSHIP_CATEGORIES)
  category!: InternshipCategory;

  @IsIn(['remote', 'onsite', 'hybrid'])
  mode!: InternshipMode;

  @IsOptional()
  @IsIn(['full-time', 'part-time'])
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsInt()
  @Min(1)
  durationWeeks!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  workingDays?: number;

  @IsOptional()
  @IsIn(['flexible', 'fixed'])
  scheduleType?: ScheduleType;

  @IsOptional()
  @IsInt()
  @Min(0)
  stipendMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stipendMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibility?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistItems?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  openings?: number;

  @IsISO8601()
  @MaxDaysFromNow(MAX_DEADLINE_DAYS_OUT, {
    message: `Application deadline can't be more than ${MAX_DEADLINE_DAYS_OUT} days from today.`,
  })
  applicationDeadline!: string;
}
