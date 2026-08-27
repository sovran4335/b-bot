import { RaidGroup } from '@prisma/client';

export interface RaidGroupDto {
  id: string;
  label: string;
  order: number;
}

export function toRaidGroupDto(group: RaidGroup): RaidGroupDto {
  return { id: group.id, label: group.label, order: group.order };
}
