import { ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';

export class TakeDownInternshipsDto {
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}
