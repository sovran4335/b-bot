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
