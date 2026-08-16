import { ArrayNotEmpty, ArrayMaxSize, IsInt } from 'class-validator';

export class TakeDownInternshipsDto {
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids!: number[];
}
