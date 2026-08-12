"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "../../../lib/hooks";
import { listLogs } from "../../../lib/api/logs";
import { LogActionType, LogEntry } from "../../../lib/types";

const ACTION_TYPES: LogActionType[] = [
  "LOGIN",
  "CHARACTER_CREATE",
  "CHARACTER_UPDATE",
  "CHARACTER_DELETE",
  "CHARACTER_REORDER",
  "RAID_TEAM_SAVE",
  "RAID_CATEGORY_CREATE",
  "RAID_CATEGORY_UPDATE",
  "RAID_CATEGORY_DELETE",
  "RAID_TEAM_CREATE",
  "RAID_TEAM_DELETE",
];

function actionBadgeColor(actionType: LogActionType): string {
  if (actionType.endsWith("CREATE"))
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (
    actionType.endsWith("UPDATE") ||
    actionType.endsWith("REORDER") ||
    actionType.endsWith("SAVE")
  )
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  if (actionType.endsWith("DELETE"))
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function AdminLogsPage() {
  const router = useRouter();
  const { data: adventure, isLoading: meLoading } = useMe();
  const [actorAdventureId, setActorAdventureId] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<LogActionType[]>([]);
  const [result, setResult] = useState<"" | "SUCCESS" | "FAILURE">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (!meLoading && adventure && !adventure.isAdmin)
      router.replace("/dashboard");
  }, [meLoading, adventure, router]);

  const { data } = useQuery({
    queryKey: [
      "logs",
      { actorAdventureId, actionTypeFilter, result, from, to, cursor },
    ],
    queryFn: () =>
      listLogs({
        cursor,
        actorAdventureId: actorAdventureId || undefined,
        actionType: actionTypeFilter.length ? actionTypeFilter : undefined,
        result: result || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: !!adventure?.isAdmin,
  });

  if (meLoading || !adventure?.isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <h1 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        활동 로그
      </h1>

      {/* LogFilterBar */}
      <div className="mb-3 flex flex-wrap items-end gap-2 text-xs">
        <div>
          <label className="block text-zinc-500">행위자(모험단 id)</label>
          <input
            value={actorAdventureId}
            onChange={(e) => setActorAdventureId(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500">액션 타입</label>
          <select
            multiple
            value={actionTypeFilter}
            onChange={(e) =>
              setActionTypeFilter(
                Array.from(
                  e.target.selectedOptions,
                  (o) => o.value as LogActionType,
                ),
              )
            }
            className="h-8 min-w-[140px] rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-zinc-500">결과</label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as typeof result)}
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">전체</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
        </div>
        <div>
          <label className="block text-zinc-500">시작일</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500">종료일</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <button
          onClick={() => setCursor(undefined)}
          className="rounded bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          검색
        </button>
      </div>

      {/* LogTable */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">시간</th>
              <th className="px-3 py-2">행위자</th>
              <th className="px-3 py-2">액션</th>
              <th className="px-3 py-2">대상</th>
              <th className="px-3 py-2">결과</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((log) => (
              <tr
                key={log.id}
                onClick={() => setDetail(log)}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{log.actorNameSnapshot}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 ${actionBadgeColor(log.actionType)}`}
                  >
                    {log.actionType}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {log.targetType ?? "-"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      log.result === "SUCCESS"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {log.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.items.length === 0 && (
          <p className="p-4 text-center text-xs text-zinc-400">
            로그가 없습니다.
          </p>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <button
          onClick={() => setCursor(data?.nextCursor ?? undefined)}
          disabled={!data?.nextCursor}
          className="text-xs text-zinc-500 underline disabled:opacity-40"
        >
          다음 페이지
        </button>
      </div>

      {/* LogDetailDrawer */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto bg-white p-4 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                로그 상세
              </h2>
              <button onClick={() => setDetail(null)} className="text-zinc-400">
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
