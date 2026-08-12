import { apiGet } from "./client";
import { LogActionType, LogEntry } from "../types";

export interface ListLogsParams {
  cursor?: string;
  limit?: number;
  actorAdventureId?: string;
  actionType?: LogActionType[];
  result?: "SUCCESS" | "FAILURE";
  from?: string;
  to?: string;
}

export const listLogs = (params: ListLogsParams) => {
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.actorAdventureId)
    query.set("actorAdventureId", params.actorAdventureId);
  if (params.actionType?.length)
    query.set("actionType", params.actionType.join(","));
  if (params.result) query.set("result", params.result);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return apiGet<{ items: LogEntry[]; nextCursor: string | null }>(
    `/logs?${query.toString()}`,
  );
};
