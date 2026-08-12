import { Adventure, ServerId } from '@prisma/client';

export interface AdventureDto {
  id: string;
  name: string;
  serverId: ServerId | null;
  isAdmin: boolean;
}

export function toAdventureDto(adventure: Adventure): AdventureDto {
  return {
    id: adventure.id,
    name: adventure.name,
    serverId: adventure.serverId,
    isAdmin: adventure.isAdmin,
  };
}
