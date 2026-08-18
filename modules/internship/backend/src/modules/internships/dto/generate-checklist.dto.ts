import { IsString, MinLength } from 'class-validator';

export class GenerateChecklistDto {
  @IsString()
  @MinLength(20)
  description!: string;
}
