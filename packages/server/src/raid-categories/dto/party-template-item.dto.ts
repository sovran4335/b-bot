import { IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PartyTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  @IsHexColor()
  colorHex?: string;
}
