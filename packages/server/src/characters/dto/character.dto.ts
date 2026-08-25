import { Character, CharacterRole } from '@prisma/client';

export interface CharacterDto {
  id: string;
  adventureId: string;
  name: string;
  job: string;
  role: CharacterRole;
  score: number;
  order: number;
  officialCharacterId: string | null;
}

// 4.4: 캐릭터 갱신 미리보기 — 서버 저장값 대비 던파 공식 홈페이지 fame(장비점수) 차이를 보여준다
export interface RefreshPreviewItemDto {
  id: string;
  name: string;
  job: string;
  oldScore: number;
  newScore: number | null; // null이면 공식 홈페이지에서 못 찾음(이름 변경 등)
}

export function toCharacterDto(character: Character): CharacterDto {
  return {
    id: character.id,
    adventureId: character.adventureId,
    name: character.name,
    job: character.job,
    role: character.role,
    score: character.score,
    order: character.order,
    officialCharacterId: character.officialCharacterId,
  };
}
