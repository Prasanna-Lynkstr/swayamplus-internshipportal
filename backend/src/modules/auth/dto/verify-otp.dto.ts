import { IsEmail, IsIn, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  identifier!: string;

  @Length(6, 6)
  otp!: string;

  @IsIn(['student', 'employer'])
  role!: 'student' | 'employer';
}
