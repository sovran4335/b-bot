import {
  ArrayNotEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartyTemplateItemDto } from './party-template-item.dto';

export class UpdateRaidCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PartyTemplateItemDto)
  partyTemplate?: PartyTemplateItemDto[];
}
