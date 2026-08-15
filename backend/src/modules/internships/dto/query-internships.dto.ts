import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { EducationLevel, Stream } from '../../../database/models/index.js';

export type InternshipSort = 'newest' | 'stipend_high' | 'deadline_soon' | 'relevance';

// category/mode/employmentType/educationLevel/stream are filter inputs, not
// writes — an unrecognized value just matches zero rows, so these stay
// loose @IsString()/@IsIn(enum) rather than validated against a taxonomy
// (unlike the create/update DTO).
export class QueryInternshipsDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  // Powers the public company page (/employers/:id) — every published
  // listing from one employer.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employerId?: number;

  // A student filters by a real level/stream, never explicitly by 'Any' —
  // but a posting can be *tagged* 'Any', so it's included here as a valid
  // stored value even though the frontend filter UI never offers it as a
  // selectable option (see FilterBar.tsx).
  @IsOptional()
  @IsIn(['UG', 'PG', 'Other', 'Any'])
  educationLevel?: EducationLevel;

  @IsOptional()
  @IsIn(['Engineering', 'Management', 'Arts', 'Commerce', 'Science', 'Law', 'Medical', 'Other', 'Any'])
  stream?: Stream;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  experienceRequired?: boolean;

  // 'Paid' is derived (stipendMin/stipendMax > 0), not a stored column — see
  // InternshipCard's stipendLabel for the same derivation on the display side.
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  q?: string;

  // 'relevance' has no explicit default here — InternshipsService picks it
  // automatically when omitted and the requester is an authenticated
  // student with skills set (see findPublished); this @IsIn only validates
  // an explicitly-passed value.
  @IsOptional()
  @IsIn(['newest', 'stipend_high', 'deadline_soon', 'relevance'])
  sort?: InternshipSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Ceiling is enforced in the service layer from MAX_PAGE_SIZE (config, not
  // a decorator literal) — only structural validation belongs here.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
