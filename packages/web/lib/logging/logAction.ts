// 7.2: 클라이언트가 직접 로그 이벤트를 만들어 fire-and-forget으로 전송한다. 실패해도 실제 작업 흐름을 막지 않는다.
import { LogActionType } from "../types";

export interface LogActionPayload {
  actionType: LogActionType;
  result: "SUCCESS" | "FAILURE";
  targetType?: "Character" | "RaidTeam" | "RaidCategory" | "Adventure";
  targetId?: string;
  metadata?: Record<string, unknown>;
  clientTimestamp: string;
}

export async function logAction(
  payload: Omit<LogActionPayload, "clientTimestamp">,
): Promise<void> {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        clientTimestamp: new Date().toISOString(),
      }),
    });
  } catch {
    console.warn("[logAction] 로그 전송 실패:", payload.actionType);
  }
}
