import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class RegisterEmployerDto {
  @IsString()
  organizationName!: string;

  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  hqCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryTags?: string[];
}
