import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaxonomyValueDto {
  // Machine value stored on referencing rows (e.g. Internship.mode) —
  // immutable after creation, see TaxonomyValue model comment.
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
