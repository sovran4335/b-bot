import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import { RaidTeam, RaidTeamSummary } from "../types";

export const listRaidTeams = (categoryId: string) =>
  apiGet<RaidTeamSummary[]>(
    `/raid-teams?categoryId=${encodeURIComponent(categoryId)}`,
  );

export const getRaidTeam = (id: string) =>
  apiGet<RaidTeam>(`/raid-teams/${id}`);

export const createRaidTeam = (categoryId: string) =>
  apiPost<RaidTeam>("/raid-teams", { categoryId });

export const deleteRaidTeam = (id: string) =>
  apiDelete<void>(`/raid-teams/${id}`);

export interface SaveRaidTeamSlot {
  slotId: string;
  characterId: string | null;
}

export const saveRaidTeam = (
  id: string,
  baseVersion: number,
  slots: SaveRaidTeamSlot[],
) => apiPut<RaidTeam>(`/raid-teams/${id}`, { baseVersion, slots });
