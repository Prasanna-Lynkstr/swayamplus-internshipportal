import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTaxonomyValueDto {
  // `value` is deliberately not editable here — see TaxonomyValue model comment.
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
