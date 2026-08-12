import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRaidTeamDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}
