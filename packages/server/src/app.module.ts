import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CharactersModule } from './characters/characters.module';
import { RaidCategoriesModule } from './raid-categories/raid-categories.module';
import { RaidTeamsModule } from './raid-teams/raid-teams.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CharactersModule,
    RaidCategoriesModule,
    RaidTeamsModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
