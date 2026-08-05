import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateEmployerDto {
  @IsOptional()
  @IsString()
  organizationName?: string;

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
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  hqCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryTags?: string[];
}
