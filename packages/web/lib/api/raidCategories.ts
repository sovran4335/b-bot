import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { RaidCategory } from "../types";

export interface PartyTemplateInput {
  label: string;
  colorHex?: string;
}

export const listRaidCategories = (groupId: string) =>
  apiGet<RaidCategory[]>(
    `/raid-categories?groupId=${encodeURIComponent(groupId)}`,
  );

export const createRaidCategory = (data: {
  groupId: string;
  label: string;
  partyTemplate: PartyTemplateInput[];
}) => apiPost<RaidCategory>("/raid-categories", data);

export const updateRaidCategory = (
  id: string,
  data: { label?: string; partyTemplate?: PartyTemplateInput[] },
) => apiPatch<RaidCategory>(`/raid-categories/${id}`, data);

export const deleteRaidCategory = (id: string) =>
  apiDelete<void>(`/raid-categories/${id}`);
