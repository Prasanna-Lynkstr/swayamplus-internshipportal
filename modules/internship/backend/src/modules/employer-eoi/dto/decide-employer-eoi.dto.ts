import { IsIn } from 'class-validator';

export class DecideEmployerEoiDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}
