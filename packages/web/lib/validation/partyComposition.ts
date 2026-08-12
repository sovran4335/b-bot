// 5.2.4: 파티 구성 규칙을 별도 모듈로 분리해 추후 규칙 자체가 바뀌어도 이 모듈만 교체하면 되도록 한다 (D10)
import { CharacterCard, PARTY_SIZE, RaidSlot } from "../types";

export interface PartyValidationIssue {
  type: "TOO_MANY_BUFFERS" | "TOO_MANY_DEALERS" | string;
  message: string;
}

export interface PartyCompositionRule {
  evaluate: (
    members: CharacterCard[],
    partySize: number,
  ) => PartyValidationIssue[];
}

// 기본 규칙: 버퍼 2명 이상, 또는 딜러만 PARTY_SIZE명(버퍼 0명)일 때만 경고
export const defaultPartyCompositionRule: PartyCompositionRule = {
  evaluate: (members, partySize) => {
    const issues: PartyValidationIssue[] = [];
    const bufferCount = members.filter((m) => m.role === "BUFFER").length;
    const dealerCount = members.filter((m) => m.role === "DEALER").length;
    if (bufferCount >= 2) {
      issues.push({
        type: "TOO_MANY_BUFFERS",
        message: "버퍼가 2명 이상입니다.",
      });
    }
    if (dealerCount >= partySize) {
      issues.push({
        type: "TOO_MANY_DEALERS",
        message: `딜러만 ${partySize}명입니다.`,
      });
    }
    return issues;
  },
};

export function usePartyCompositionRule(): PartyCompositionRule {
  return defaultPartyCompositionRule; // 지금은 고정, 추후 카테고리별 규칙 주입 지점
}

export interface RaidTeamValidationResult {
  partyIssues: Record<string, PartyValidationIssue[]>; // partyId -> issues
  // 캐릭터 목록에 소속 모험단 "이름"은 내려오지 않으므로(adventureId만 있음) 캐릭터 이름들로 근사 표시한다 [가정]
  duplicateAdventures: { adventureId: string; characterNames: string[] }[];
}

// 5.2.4: 파티별 구성 경고 + 기수 전체의 모험단 중복 경고를 함께 계산하는 순수 함수
export function validateRaidTeam(
  slots: RaidSlot[],
  characters: CharacterCard[],
  rule: PartyCompositionRule,
): RaidTeamValidationResult {
  const characterById = new Map(characters.map((c) => [c.id, c]));

  const membersByParty = new Map<string, CharacterCard[]>();
  for (const slot of slots) {
    if (!slot.character) continue;
    const character = characterById.get(slot.character.id) ?? slot.character;
    const list = membersByParty.get(slot.partyId) ?? [];
    list.push(character);
    membersByParty.set(slot.partyId, list);
  }

  const partyIssues: Record<string, PartyValidationIssue[]> = {};
  for (const [partyId, members] of membersByParty) {
    partyIssues[partyId] = rule.evaluate(members, PARTY_SIZE);
  }

  const namesByAdventure = new Map<string, string[]>();
  for (const slot of slots) {
    if (!slot.character) continue;
    const names = namesByAdventure.get(slot.character.adventureId) ?? [];
    names.push(slot.character.name);
    namesByAdventure.set(slot.character.adventureId, names);
  }
  const duplicateAdventures = [...namesByAdventure.entries()]
    .filter(([, names]) => names.length >= 2)
    .map(([adventureId, characterNames]) => ({ adventureId, characterNames }));

  return { partyIssues, duplicateAdventures };
}
