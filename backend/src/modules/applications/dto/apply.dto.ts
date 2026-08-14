import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

class ChecklistResponseDto {
  @IsString()
  item!: string;

  @IsBoolean()
  met!: boolean;
}

export class ApplyDto {
  @IsOptional()
  @IsString()
  coverNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistResponseDto)
  checklistResponses?: ChecklistResponseDto[];
}
