import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LogActionType, LogResult } from '@prisma/client';
import type { Adventure } from '@prisma/client';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { LogDto } from './dto/log.dto';
import { SessionGuard } from '../auth/session.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentAdventure } from '../auth/current-adventure.decorator';

@Controller('logs')
@UseGuards(SessionGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentAdventure() actor: Adventure,
    @Body() dto: CreateLogDto,
  ): Promise<void> {
    await this.logsService.create(actor, dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('actorAdventureId') actorAdventureId?: string,
    @Query('actionType') actionType?: string | string[],
    @Query('result') result?: LogResult,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{ items: LogDto[]; nextCursor: string | null }> {
    return this.logsService.list({
      cursor,
      limit: limit ? Number(limit) : undefined,
      actorAdventureId,
      actionType: actionType
        ? ((Array.isArray(actionType)
            ? actionType
            : actionType.split(',')) as LogActionType[])
        : undefined,
      result,
      from,
      to,
    });
  }
}
