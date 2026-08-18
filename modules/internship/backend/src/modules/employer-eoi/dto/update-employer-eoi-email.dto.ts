import { IsEmail } from 'class-validator';

export class UpdateEmployerEoiEmailDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  email!: string;
}
