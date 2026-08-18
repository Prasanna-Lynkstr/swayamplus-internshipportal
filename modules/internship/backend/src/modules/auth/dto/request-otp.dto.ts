import { IsEmail, IsIn } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  identifier!: string;

  @IsIn(['student', 'employer'])
  role!: 'student' | 'employer';
}
