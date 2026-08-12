import { apiGet, apiPatch, apiPost } from "./client";
import { Adventure, ServerId } from "../types";

export const login = (adventureName: string) =>
  apiPost<{ adventure: Adventure; isNewUser: boolean }>("/auth/login", {
    adventureName,
  });

export const logout = () => apiPost<{ ok: true }>("/auth/logout");

export const getMe = () => apiGet<Adventure>("/me");

export const selectServer = (serverId: ServerId) =>
  apiPatch<Adventure>("/me/server", { serverId });
