import { IsArray, IsIn, IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';
import { IsDateWithinDays } from '../../../common/decorators/is-date-within-days.decorator.js';
import type { AvailabilityStatus } from '../../../database/models/index.js';

const AVAILABILITY_STATUSES: AvailabilityStatus[] = [
  'actively_looking',
  'not_looking',
  'available_from',
];
const MAX_AVAILABLE_FROM_DAYS = 60;

// preferredCategories/preferredModes/preferredEmploymentTypes/paidPreference
// are validated against their active taxonomy in StudentsService
// (TaxonomiesService.assertValid), not a hardcoded @IsIn — see
// common/constants/taxonomies.ts. availabilityStatus/availableFrom are a
// code-level enum + conditionally-required date instead (see
// student-preference.model.ts for why this isn't a taxonomy).
export class UpdateStudentPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredModes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredEmploymentTypes?: string[];

  @IsOptional()
  @IsString()
  paidPreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rolesOfInterest?: string[];

  @IsOptional()
  @IsIn(AVAILABILITY_STATUSES)
  availabilityStatus?: AvailabilityStatus;

  // Only required/validated when availabilityStatus is being set to
  // 'available_from' in this same request — StudentsService clears it back
  // to null for the other two statuses regardless of what's sent here.
  @ValidateIf((dto: UpdateStudentPreferencesDto) => dto.availabilityStatus === 'available_from')
  @IsISO8601()
  @IsDateWithinDays(MAX_AVAILABLE_FROM_DAYS, {
    message: `availableFrom must be today or within the next ${MAX_AVAILABLE_FROM_DAYS} days.`,
  })
  availableFrom?: string;
}
