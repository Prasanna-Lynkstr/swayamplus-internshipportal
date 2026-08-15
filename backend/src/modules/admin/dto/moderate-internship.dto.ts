import { IsIn } from 'class-validator';

export class ModerateInternshipDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';
}
