"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import {
  getRefreshPreview,
  RefreshPreviewItem,
  updateCharacter,
} from "../../lib/api/characters";
import { ApiError } from "../../lib/api/client";
import { logAction } from "../../lib/logging/logAction";
import { CharacterAvatar } from "./CharacterAvatar";
import CharacterTypeIcon from "./CharacterTypeIcon";

function DiffBadge({
  oldScore,
  newScore,
}: {
  oldScore: number;
  newScore: number;
}) {
  const diff = newScore - oldScore;
  if (diff === 0)
    return <span className="text-xs text-zinc-400">변동 없음</span>;
  const positive = diff > 0;
  return (
    <span
      className={`text-[15px] font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}
    >
      {positive ? "+" : ""}
      {diff.toLocaleString()}
    </span>
  );
}

export function CharacterRefreshModal({ onClose }: { onClose: () => void }) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [saveProgress, setSaveProgress] = useState(0);
  const [hideUnchanged, setHideUnchanged] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["characters-refresh-preview"],
    queryFn: getRefreshPreview,
  });

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyTargets: RefreshPreviewItem[] =
    data?.filter(
      (c) =>
        c.newScore !== null && c.newScore !== c.oldScore && !excluded.has(c.id),
    ) ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      // 서버 갱신 순서가 중요하지 않으므로 순차 호출로 단순하게 처리
      setSaveProgress(0);
      for (const c of applyTargets) {
        await updateCharacter(c.id, { score: c.newScore! });
        setSaveProgress((p) => p + 1);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
      await logAction({
        actionType: "CHARACTER_UPDATE",
        result: "SUCCESS",
        targetType: "Character",
      });
      onClose();
    },
    onError: async () => {
      await logAction({ actionType: "CHARACTER_UPDATE", result: "FAILURE" });
    },
  });

  return (
    <Modal title="캐릭터 갱신" onClose={onClose} wide>
      <div className="space-y-2">
        {isLoading && (
          <div className="space-y-1">
            <p className="pb-1 text-center text-xs text-zinc-400">
              던파 공식 홈페이지에서 장비점수를 조회하는 중...
            </p>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="text-xs text-red-600">
            {error instanceof ApiError
              ? error.body.message
              : "장비점수 조회에 실패했습니다."}
          </p>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                서버 저장값과 던파 공식 홈페이지 값을 비교했습니다. 반영하지 않을 캐릭터는 제외하세요.
              </p>
              <button
                onClick={() => setHideUnchanged((v) => !v)}
                className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${
                  hideUnchanged
                    ? "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                    : "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                }`}
              >
                {hideUnchanged ? "변동 없는 캐릭터도 보기" : "변동 없는 캐릭터 숨기기"}
              </button>
            </div>
            {
              hideUnchanged && applyTargets.length === 0 && (
                <p className="mt-5">장비점수가 갱신된 캐릭터가 없습니다. 겜 좀 해라</p>
              )
            }
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {data
                .filter(
                  (c) =>
                    !hideUnchanged ||
                    c.newScore === null ||
                    c.newScore !== c.oldScore,
                )
                .map((c) => {
                  const notFound = c.newScore === null;
                  const isExcluded = excluded.has(c.id);
                  const hasChange = !notFound && c.newScore !== c.oldScore;
                  const borderClass = !hasChange
                    ? "border-zinc-200 dark:border-zinc-800"
                    : c.newScore! > c.oldScore
                      ? "border-emerald-400 dark:border-emerald-600"
                      : "border-red-400 dark:border-red-600";
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${borderClass} ${notFound || isExcluded ? "opacity-50" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <CharacterAvatar
                          serverId={c.serverId}
                          officialCharacterId={c.officialCharacterId}
                          jobId={c.jobId}
                        />
                        <div className="min-w-0 flex flex-col">
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {c.name}
                          </span>
                          <span className="text-xs text-zinc-500">{c.job}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notFound ? (
                          <span className="text-xs text-zinc-400">
                            공식 홈페이지에서 못 찾음
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <CharacterTypeIcon jobType={c.role} />
                              <span className="text-[12px] font-bold text-[#3392ff]">
                                {c.oldScore.toLocaleString()} →{" "}
                                {c.newScore!.toLocaleString()}
                              </span>
                            </div>
                            <DiffBadge
                              oldScore={c.oldScore}
                              newScore={c.newScore!}
                            />
                          </>
                        )}
                        <button
                          onClick={() => toggle(c.id)}
                          disabled={notFound}
                          className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:hover:text-zinc-400"
                          aria-label={`${c.name} 갱신 제외`}
                        >
                          {isExcluded || notFound ? "제외됨" : "✕"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-600">저장에 실패했습니다.</p>
            )}

            {mutation.isPending && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                    style={{
                      width: `${(saveProgress / applyTargets.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-center text-xs text-zinc-400">
                  저장 중... ({saveProgress}/{applyTargets.length})
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 text-sm">
              <button
                onClick={onClose}
                disabled={mutation.isPending}
                className="px-3 py-1.5 text-zinc-500 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={applyTargets.length === 0 || mutation.isPending}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {mutation.isPending
                  ? `저장 중... (${saveProgress}/${applyTargets.length})`
                  : `저장 (${applyTargets.length}명)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
