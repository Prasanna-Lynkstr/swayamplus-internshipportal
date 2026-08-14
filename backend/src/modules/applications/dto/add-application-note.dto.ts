import { IsString, MinLength } from 'class-validator';

export class AddApplicationNoteDto {
  @IsString()
  @MinLength(1)
  note!: string;
}
