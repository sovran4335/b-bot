import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { CharacterCard, Role, ServerId } from "../types";

export interface CharacterFormValues {
  name: string;
  job: string;
  role: Role;
  score: number;
}

export const listCharacters = () => apiGet<CharacterCard[]>("/characters");

export const createCharacter = (data: CharacterFormValues) =>
  apiPost<CharacterCard>("/characters", data);

export const updateCharacter = (
  id: string,
  data: Partial<CharacterFormValues>,
) => apiPatch<CharacterCard>(`/characters/${id}`, data);

export const deleteCharacter = (id: string) =>
  apiDelete<void>(`/characters/${id}`);

export const reorderCharacters = (orderedIds: string[]) =>
  apiPatch<CharacterCard[]>("/characters/reorder", { orderedIds });

export interface RefreshPreviewItem {
  id: string;
  name: string;
  job: string;
  oldScore: number;
  newScore: number | null; // null이면 공식 홈페이지에서 못 찾음
  officialCharacterId: string | null;
  serverId: ServerId | null;
  jobId: string | null;
}

export const getRefreshPreview = () =>
  apiGet<RefreshPreviewItem[]>("/characters/refresh-preview");

export interface OfficialIdLookupResult {
  name: string;
  officialCharacterId: string | null;
  jobId: string | null;
}

// 등록 미리보기(캐릭터가 아직 DB에 없는 시점)에서 초상화 이미지를 붙이기 위한 조회
export const resolveOfficialIds = (names: string[]) =>
  apiPost<OfficialIdLookupResult[]>("/characters/resolve-official-ids", {
    names,
  });
