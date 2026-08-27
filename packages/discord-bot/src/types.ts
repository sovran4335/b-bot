// packages/server가 내려주는 응답 모양 중 봇이 쓰는 부분만 최소로 옮겨 적었다
// (web도 자기 lib/types.ts에 똑같이 따로 들고 있음 — 이 모노레포에 공유 타입 패키지가 없어서 관례대로 중복).

export type ServerId =
  | "anton"
  | "bakal"
  | "cain"
  | "casillas"
  | "diregie"
  | "hilder"
  | "prey"
  | "siroco";

export type Role = "DEALER" | "BUFFER";

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
}

export interface RaidTeamSummary {
  id: string;
  categoryId: string;
  generationLabel: string;
  generationIndex: number;
  version: number;
  updatedAt: string;
}

export interface RaidPartyDefinition {
  id: string;
  label: string;
  colorHex: string | null;
  order: number;
}

export interface RaidSlotCharacter {
  id: string;
  name: string;
  job: string;
  role: Role;
  score: number;
  adventureName: string;
}

export interface RaidSlot {
  id: string;
  partyId: string;
  slotInParty: number;
  character: RaidSlotCharacter | null;
}

export interface RaidTeamDetail extends RaidTeamSummary {
  parties: RaidPartyDefinition[];
  slots: RaidSlot[];
}
