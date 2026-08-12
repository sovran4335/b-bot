import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { CharacterCard, Role } from "../types";

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
