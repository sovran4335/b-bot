import { ArrayNotEmpty, IsString } from 'class-validator';

export class ReorderCharactersDto {
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds!: string[];
}
