import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  employerRegistrationOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApproveEmployers?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  resumeParsingEnabled?: boolean;

  @IsOptional()
  @IsIn(['anthropic', 'openai'])
  resumeParsingProvider?: 'anthropic' | 'openai';
}
