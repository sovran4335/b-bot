import { Module } from '@nestjs/common';
import { RaidCategoriesController } from './raid-categories.controller';
import { RaidCategoriesService } from './raid-categories.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RaidCategoriesController],
  providers: [RaidCategoriesService],
})
export class RaidCategoriesModule {}
