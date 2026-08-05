import { IsOptional, IsString } from 'class-validator';

export class CreateInternshipRequestDto {
  @IsString()
  domain!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
