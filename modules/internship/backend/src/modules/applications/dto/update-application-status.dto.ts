import { IsIn } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsIn(['shortlisted', 'interviewing', 'offered', 'rejected'])
  status!: 'shortlisted' | 'interviewing' | 'offered' | 'rejected';
}
