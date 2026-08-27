import { Module } from '@nestjs/common';
import { RaidGroupsController } from './raid-groups.controller';
import { RaidGroupsService } from './raid-groups.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RaidGroupsController],
  providers: [RaidGroupsService],
})
export class RaidGroupsModule {}
