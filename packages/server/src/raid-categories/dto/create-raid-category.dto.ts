import {
  ArrayNotEmpty,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartyTemplateItemDto } from './party-template-item.dto';

export class CreateRaidCategoryDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ArrayNotEmpty() // [가정: 파티가 0개인 탭은 의미가 없으므로] (5.2)
  @ValidateNested({ each: true })
  @Type(() => PartyTemplateItemDto)
  partyTemplate!: PartyTemplateItemDto[];
}
