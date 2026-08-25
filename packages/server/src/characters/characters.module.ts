import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { NexonScoreService } from './nexon-score.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CharactersController],
  providers: [CharactersService, NexonScoreService],
})
export class CharactersModule {}
