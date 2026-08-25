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

export interface RaidCategory {
  id: string;
  label: string;
  order: number;
  partyTemplate: PartyDefinition[];
}

export interface RaidSlot {
  id: string;
  partyId: string;
  slotInParty: number;
  character: CharacterCard | null;
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
