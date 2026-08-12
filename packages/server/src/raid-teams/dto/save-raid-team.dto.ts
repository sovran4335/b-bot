import {
  ArrayNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SlotUpdateDto {
  @IsString()
  slotId!: string;

  @IsOptional()
  @IsString()
  characterId!: string | null;
}

export class SaveRaidTeamDto {
  @IsInt()
  baseVersion!: number;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SlotUpdateDto)
  slots!: SlotUpdateDto[];
}
