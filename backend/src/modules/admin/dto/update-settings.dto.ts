import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  employerRegistrationOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApproveEmployers?: boolean;
}
