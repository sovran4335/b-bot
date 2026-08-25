import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { NexonScoreService } from './nexon-score.service';
import { NeopleCharacterService } from './neople-character.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CharactersController],
  providers: [CharactersService, NexonScoreService, NeopleCharacterService],
})
export class CharactersModule {}
