// 3장 데이터 모델 (FRONTEND_SPEC.md)

export type ServerId =
  | "anton"
  | "bakal"
  | "cain"
  | "casillas"
  | "diregie"
  | "hilder"
  | "prey"
  | "siroco";

export const SERVER_LABELS: Record<ServerId, string> = {
  anton: "안톤",
  bakal: "바칼",
  cain: "카인",
  casillas: "카시야스",
  diregie: "디레지에",
  hilder: "힐더",
  prey: "프레이",
  siroco: "시로코",
};

export type Role = "DEALER" | "BUFFER";

export interface Adventure {
  id: string;
  name: string;
  serverId: ServerId | null;
  isAdmin: boolean;
}

export interface CharacterCard {
  id: string;
  adventureId: string;
  name: string;
  job: string;
  role: Role;
  score: number;
  order: number;
  officialCharacterId: string | null;
  serverId: ServerId | null;
  jobId: string | null; // 던파 공식 API 직업 대분류 id ([[jobCategories]] 참고)
}

export interface PartyDefinition {
  id: string;
  label: string;
  colorHex: string | null;
  order: number;
}

export const PARTY_SIZE = 4 as const; // D10: 파티 인원수는 항상 4명 고정

// 상위탭. 예: "미카엘라", "디레지에" — 아래에 일반/하드/쌀 같은 카테고리를 따로 둔다.
// 같은 캐릭터는 같은 그룹 안에서는 기수 하나에만 배치될 수 있다(서버가 저장 시점에 강제).
export interface RaidGroup {
  id: string;
  label: string;
  order: number;
}

export interface RaidCategory {
  id: string;
  groupId: string;
  label: string;
  order: number;
  partyTemplate: PartyDefinition[];
}

// 좌측 캐릭터 패널 "배치됨" 배지용
export interface CharacterPlacement {
  characterId: string;
  groupLabel: string;
  categoryLabel: string;
  generationLabel: string;
}

export interface RaidSlot {
  id: string;
  partyId: string;
  slotInParty: number;
  // adventureName은 서버가 내려주는 공대표 상세에만 있음(D5 — 여러 모험단 캐릭터가 섞여 배치되므로 구분용).
  // 로컬 드래그 배치 직후(저장 전) 낙관적 갱신 시점엔 아직 없을 수 있어 optional.
  character: (CharacterCard & { adventureName?: string }) | null;
}

export interface RaidTeamSummary {
  id: string;
  categoryId: string;
  generationLabel: string;
  generationIndex: number;
  version: number;
  updatedAt: string;
}

export interface RaidTeam extends RaidTeamSummary {
  parties: PartyDefinition[];
  slots: RaidSlot[];
}

export type LogActionType =
  | "LOGIN"
  | "CHARACTER_CREATE"
  | "CHARACTER_UPDATE"
  | "CHARACTER_DELETE"
  | "CHARACTER_REORDER"
  | "RAID_TEAM_SAVE"
  | "RAID_CATEGORY_CREATE"
  | "RAID_CATEGORY_UPDATE"
  | "RAID_CATEGORY_DELETE"
  | "RAID_TEAM_CREATE"
  | "RAID_TEAM_DELETE";

export interface LogEntry {
  id: string;
  actorAdventureId: string | null;
  actorNameSnapshot: string;
  actionType: LogActionType;
  result: "SUCCESS" | "FAILURE";
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  clientTimestamp: string;
  createdAt: string;
}
