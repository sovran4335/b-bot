import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateRaidGroupDto {
  @IsString()
  @IsNotEmpty()
  label!: string;
}
