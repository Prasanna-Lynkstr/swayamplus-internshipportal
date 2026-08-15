import { IsIn } from 'class-validator';

export class UpdateEmployerModerationDto {
  @IsIn(['auto_publish', 'review'])
  moderationMode!: 'auto_publish' | 'review';
}
