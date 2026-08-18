import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MaxDaysFromNow } from '../../../common/decorators/max-days-from-now.decorator.js';
import type { ChecklistItemType, EducationLevel, Stream } from '../../../database/models/index.js';

const MAX_DEADLINE_DAYS_OUT = 90;
const EDUCATION_LEVELS: EducationLevel[] = ['Any', 'UG', 'PG', 'Other'];
const STREAMS: Stream[] = [
  'Any',
  'Engineering',
  'Management',
  'Arts',
  'Commerce',
  'Science',
  'Law',
  'Medical',
  'Other',
];
const CHECKLIST_ITEM_TYPES: ChecklistItemType[] = ['rating', 'yesno'];

class ChecklistItemDto {
  @IsString()
  item!: string;

  @IsIn(CHECKLIST_ITEM_TYPES)
  type!: ChecklistItemType;
}

// category/mode/employmentType/scheduleType are validated against their
// active taxonomy in InternshipsService (TaxonomiesService.assertValid), not
// a hardcoded @IsIn — see common/constants/taxonomies.ts. educationLevel/
// stream are plain code-level enums instead (see internship.model.ts) —
// required on every new posting, unlike the nullable-for-legacy-rows column.
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
  category!: string;

  @IsString()
  mode!: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

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
  @IsString()
  scheduleType?: string;

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

  @IsIn(EDUCATION_LEVELS)
  educationLevel!: EducationLevel;

  @IsIn(STREAMS)
  stream!: Stream;

  @IsBoolean()
  experienceRequired!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];

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
