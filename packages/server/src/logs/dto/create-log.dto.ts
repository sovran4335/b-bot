import {
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { LogActionType, LogResult } from '@prisma/client';

export class CreateLogDto {
  @IsEnum(LogActionType)
  actionType!: LogActionType;

  @IsEnum(LogResult)
  result!: LogResult;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsISO8601()
  clientTimestamp!: string;
}
