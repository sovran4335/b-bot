import { CategoryPartyTemplate, RaidCategory } from '@prisma/client';

export interface RaidCategoryDto {
  id: string;
  label: string;
  order: number;
  partyTemplate: {
    id: string;
    label: string;
    colorHex: string | null;
    order: number;
  }[];
}

export function toRaidCategoryDto(
  category: RaidCategory & { partyTemplates: CategoryPartyTemplate[] },
): RaidCategoryDto {
  return {
    id: category.id,
    label: category.label,
    order: category.order,
    partyTemplate: category.partyTemplates
      .sort((a, b) => a.order - b.order)
      .map((t) => ({
        id: t.id,
        label: t.label,
        colorHex: t.colorHex,
        order: t.order,
      })),
  };
}
