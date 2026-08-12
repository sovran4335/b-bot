import { Injectable } from '@nestjs/common';
import { Adventure, LogActionType, LogResult, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLogDto } from './dto/create-log.dto';
import { LogDto, toLogDto } from './dto/log.dto';

export interface ListLogsQuery {
  cursor?: string;
  limit?: number;
  actorAdventureId?: string;
  actionType?: LogActionType[];
  result?: LogResult;
  from?: string;
  to?: string;
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: Adventure, dto: CreateLogDto): Promise<void> {
    const parsed = new Date(dto.clientTimestamp);
    // 클라이언트 시계 오차 등으로 파싱 실패/미래시각이면 서버 수신 시각으로 대체 [가정] (7.1)
    const clientTimestamp =
      Number.isNaN(parsed.getTime()) || parsed > new Date()
        ? new Date()
        : parsed;

    await this.prisma.actionLog.create({
      data: {
        actorAdventureId: actor.id,
        actorNameSnapshot: actor.name,
        actionType: dto.actionType,
        result: dto.result,
        targetType: dto.targetType,
        targetId: dto.targetId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        clientTimestamp,
      },
    });
  }

  async list(
    query: ListLogsQuery,
  ): Promise<{ items: LogDto[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const where: Prisma.ActionLogWhereInput = {
      actorAdventureId: query.actorAdventureId,
      actionType: query.actionType ? { in: query.actionType } : undefined,
      result: query.result,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };

    const rows = await this.prisma.actionLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(toLogDto),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }
}
