import { IsEnum } from 'class-validator';
import { ServerId } from '@prisma/client';

export class SelectServerDto {
  @IsEnum(ServerId)
  serverId!: ServerId;
}
