import { Module } from '@nestjs/common';
import { RaidTeamsController } from './raid-teams.controller';
import { RaidTeamsService } from './raid-teams.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RaidTeamsController],
  providers: [RaidTeamsService],
})
export class RaidTeamsModule {}
