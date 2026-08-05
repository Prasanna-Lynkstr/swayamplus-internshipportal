import { IsEmail, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @MinLength(1)
  password!: string;
}
