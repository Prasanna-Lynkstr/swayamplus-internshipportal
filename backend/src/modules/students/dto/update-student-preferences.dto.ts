import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { INTERNSHIP_CATEGORIES } from '../../../common/constants/categories.js';

export class UpdateStudentPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsIn(INTERNSHIP_CATEGORIES, { each: true })
  preferredCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['remote', 'onsite', 'hybrid'], { each: true })
  preferredModes?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['full-time', 'part-time'], { each: true })
  preferredEmploymentTypes?: string[];

  @IsOptional()
  @IsIn(['paid', 'unpaid', 'either'])
  paidPreference?: 'paid' | 'unpaid' | 'either';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rolesOfInterest?: string[];

  @IsOptional()
  @IsString()
  availability?: string;
}
