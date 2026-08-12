import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { CharacterRole } from '@prisma/client';

// 4.5: 4.2와 동일 스키마의 부분 업데이트. 필드 4개뿐이라 PartialType 없이 손으로 optional 선언.
export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  job?: string;

  @IsOptional()
  @IsEnum(CharacterRole)
  role?: CharacterRole;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}
