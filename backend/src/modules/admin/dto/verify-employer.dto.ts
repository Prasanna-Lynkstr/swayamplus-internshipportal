import { IsIn, IsOptional, IsString } from 'class-validator';

export class VerifyEmployerDto {
  @IsIn(['approved', 'rejected', 'suspended'])
  status!: 'approved' | 'rejected' | 'suspended';

  @IsOptional()
  @IsString()
  reason?: string;
}
