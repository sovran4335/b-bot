import {
  Adventure,
  Character,
  RaidSlot,
  RaidTeam,
  RaidTeamParty,
} from '@prisma/client';
import {
  CharacterDto,
  toCharacterDto,
} from '../../characters/dto/character.dto';

export interface RaidTeamSummaryDto {
  id: string;
  categoryId: string;
  generationLabel: string;
  generationIndex: number;
  version: number;
  updatedAt: string;
}

export function toRaidTeamSummaryDto(team: RaidTeam): RaidTeamSummaryDto {
  return {
    id: team.id,
    categoryId: team.categoryId,
    generationLabel: team.generationLabel,
    generationIndex: team.generationIndex,
    version: team.version,
    updatedAt: team.updatedAt.toISOString(),
  };
}

type SlotWithCharacter = RaidSlot & {
  character: (Character & { adventure: Adventure }) | null;
};
type TeamWithDetail = RaidTeam & {
  parties: RaidTeamParty[];
  slots: SlotWithCharacter[];
};

export interface RaidTeamDetailDto extends RaidTeamSummaryDto {
  parties: {
    id: string;
    label: string;
    colorHex: string | null;
    order: number;
  }[];
  slots: {
    id: string;
    partyId: string;
    slotInParty: number;
    // 다른 모험단 캐릭터도 같은 공대표에 섞여 배치될 수 있어(D5) 카드에 소속 모험단 이름을 같이 내려준다
    character: (CharacterDto & { adventureName: string }) | null;
  }[];
}

export function toRaidTeamDetailDto(team: TeamWithDetail): RaidTeamDetailDto {
  return {
    ...toRaidTeamSummaryDto(team),
    parties: team.parties
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        id: p.id,
        label: p.label,
        colorHex: p.colorHex,
        order: p.order,
      })),
    slots: team.slots.map((s) => ({
      id: s.id,
      partyId: s.partyId,
      slotInParty: s.slotInParty,
      character: s.character
        ? {
            ...toCharacterDto(s.character),
            adventureName: s.character.adventure.name,
          }
        : null,
    })),
  };
}
