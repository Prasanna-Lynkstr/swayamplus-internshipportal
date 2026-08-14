import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateInterestRegistrationDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  areaOfInterest?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
