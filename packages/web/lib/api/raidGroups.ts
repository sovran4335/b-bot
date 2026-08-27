import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { RaidGroup } from "../types";

export const listRaidGroups = () => apiGet<RaidGroup[]>("/raid-groups");

export const createRaidGroup = (label: string) =>
  apiPost<RaidGroup>("/raid-groups", { label });

export const updateRaidGroup = (id: string, label: string) =>
  apiPatch<RaidGroup>(`/raid-groups/${id}`, { label });

export const deleteRaidGroup = (id: string) =>
  apiDelete<void>(`/raid-groups/${id}`);
