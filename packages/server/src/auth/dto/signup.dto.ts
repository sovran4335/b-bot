import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ServerId } from '@prisma/client';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  adventureName!: string;

  @IsEnum(ServerId)
  serverId!: ServerId;
}
