import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { CharacterRole } from '@prisma/client';

export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30) // [가정 — 명시된 제약 없음] (4.2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  job!: string;

  @IsEnum(CharacterRole)
  role!: CharacterRole;

  @IsInt()
  @Min(0)
  score!: number;
}
