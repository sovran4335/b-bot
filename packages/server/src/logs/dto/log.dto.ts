import { ActionLog } from '@prisma/client';

export interface LogDto {
  id: string;
  actorAdventureId: string | null;
  actorNameSnapshot: string;
  actionType: string;
  result: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  clientTimestamp: string;
  createdAt: string;
}

export function toLogDto(log: ActionLog): LogDto {
  return {
    id: log.id,
    actorAdventureId: log.actorAdventureId,
    actorNameSnapshot: log.actorNameSnapshot,
    actionType: log.actionType,
    result: log.result,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: log.metadata as Record<string, unknown> | null,
    clientTimestamp: log.clientTimestamp.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
