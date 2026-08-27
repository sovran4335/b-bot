"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRaidGroups, useRaidCategories } from "../../lib/hooks";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";
import { deleteRaidGroup } from "../../lib/api/raidGroups";
import { listRaidTeams, createRaidTeam } from "../../lib/api/raidTeams";
import { deleteRaidCategory } from "../../lib/api/raidCategories";
import { Adventure, RaidCategory, RaidGroup } from "../../lib/types";
import { RaidGenerationSection } from "./RaidGenerationSection";
import { RaidCategoryFormModal } from "./RaidCategoryFormModal";
import { RaidGroupFormModal } from "./RaidGroupFormModal";
import { logAction } from "../../lib/logging/logAction";

export function RaidPanel({ adventure }: { adventure: Adventure }) {
  const queryClient = useQueryClient();
  const { data: groups } = useRaidGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [groupFormTarget, setGroupFormTarget] = useState<
    "new" | RaidGroup | null
  >(null);
  const [categoryFormTarget, setCategoryFormTarget] = useState<
    "new" | RaidCategory | null
  >(null);
  const drafts = useRaidDraftStore((s) => s.drafts);

  const groupId =
    (selectedGroupId && groups?.some((g) => g.id === selectedGroupId)
      ? selectedGroupId
      : null) ??
    groups?.[0]?.id ??
    null;

  const { data: categories } = useRaidCategories(groupId);

  const categoryId =
    (selectedCategoryId &&
    categories?.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : null) ??
    categories?.[0]?.id ??
    null;

  const { data: teams } = useQuery({
    queryKey: ["raid-teams", categoryId],
    queryFn: () => listRaidTeams(categoryId!),
    enabled: !!categoryId,
  });

  // 기수별 저장 함수 레지스트리 — 각 RaidGenerationSection이 자기 저장 mutate를 등록해두면
  // "일괄 저장"은 그중 dirty한 것만 호출한다. 저장/충돌해결 로직은 그대로 섹션 쪽에 남겨두고
  // (개별 저장 버튼도 동일 mutate를 씀) 여기선 트리거만 한다.
  const saveFnsRef = useRef<Map<string, () => void>>(new Map());
  const registerSave = useCallback((teamId: string, save: () => void) => {
    saveFnsRef.current.set(teamId, save);
  }, []);

  const createTeamMutation = useMutation({
    mutationFn: () => createRaidTeam(categoryId!),
    onSuccess: async (team) => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      await logAction({
        actionType: "RAID_TEAM_CREATE",
        result: "SUCCESS",
        targetType: "RaidTeam",
        targetId: team.id,
      });
    },
    onError: () =>
      logAction({ actionType: "RAID_TEAM_CREATE", result: "FAILURE" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => deleteRaidGroup(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["raid-groups"] });
      setSelectedGroupId(null);
      setSelectedCategoryId(null);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteRaidCategory(id),
    onSuccess: async (_d, id) => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-categories", groupId],
      });
      setSelectedCategoryId(null);
      await logAction({
        actionType: "RAID_CATEGORY_DELETE",
        result: "SUCCESS",
        targetType: "RaidCategory",
        targetId: id,
      });
    },
    onError: () =>
      logAction({ actionType: "RAID_CATEGORY_DELETE", result: "FAILURE" }),
  });

  const selectedGroup = groups?.find((g) => g.id === groupId) ?? null;
  const selectedCategory =
    categories?.find((c) => c.id === categoryId) ?? null;
  const dirtyTeamIds = (teams ?? [])
    .filter((t) => drafts[t.id]?.dirty)
    .map((t) => t.id);
  const handleSaveAll = () => {
    for (const id of dirtyTeamIds) saveFnsRef.current.get(id)?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 상위탭 */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3 pt-2 dark:border-zinc-800 dark:bg-zinc-950">
        {groups?.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setSelectedGroupId(g.id);
              setSelectedCategoryId(null);
            }}
            className={`rounded-t-lg px-3 py-1.5 text-sm ${
              g.id === groupId
                ? "bg-white font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {g.label}
          </button>
        ))}
        {adventure.isAdmin && (
          <button
            onClick={() => setGroupFormTarget("new")}
            className="ml-1 rounded-full px-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            +
          </button>
        )}
        {adventure.isAdmin && selectedGroup && (
          <div className="ml-auto flex gap-2 pb-1 text-xs text-zinc-400">
            <button
              onClick={() => setGroupFormTarget(selectedGroup)}
              className="hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              상위탭 수정
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    `"${selectedGroup.label}" 상위탭을 삭제하면 소속된 모든 카테고리·기수가 함께 삭제됩니다. 계속할까요?`,
                  )
                )
                  deleteGroupMutation.mutate(selectedGroup.id);
              }}
              className="hover:text-red-600"
            >
              상위탭 삭제
            </button>
          </div>
        )}
      </div>

      {groups?.length === 0 && (
        <p className="p-3 text-sm text-zinc-400">
          {adventure.isAdmin
            ? "상위탭이 없습니다. + 버튼으로 먼저 만들어주세요 (예: 미카엘라)."
            : "아직 생성된 상위탭이 없습니다."}
        </p>
      )}

      {groupId && (
        <>
          {/* 5.2.1: 카테고리(하위탭) */}
          <div className="flex items-center gap-1 border-b border-zinc-200 px-3 pt-2 dark:border-zinc-800">
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`rounded-t-lg px-3 py-1.5 text-sm ${
                  c.id === categoryId
                    ? "bg-white font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {c.label}
              </button>
            ))}
            {adventure.isAdmin && (
              <button
                onClick={() => setCategoryFormTarget("new")}
                className="ml-1 rounded-full px-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                +
              </button>
            )}
            {adventure.isAdmin && selectedCategory && (
              <div className="ml-auto flex gap-2 pb-1 text-xs text-zinc-400">
                <button
                  onClick={() => setCategoryFormTarget(selectedCategory)}
                  className="hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  탭 수정
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `"${selectedCategory.label}" 탭을 삭제하면 소속된 모든 기수가 함께 삭제됩니다. 계속할까요?`,
                      )
                    )
                      deleteCategoryMutation.mutate(selectedCategory.id);
                  }}
                  className="hover:text-red-600"
                >
                  탭 삭제
                </button>
              </div>
            )}
          </div>

          {categoryId && (
            <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              {dirtyTeamIds.length > 0 && (
                <span className="mr-auto text-xs text-amber-600">
                  저장하지 않은 기수 {dirtyTeamIds.length}개
                </span>
              )}
              {(teams?.length ?? 0) > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={dirtyTeamIds.length === 0}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  전체 저장
                </button>
              )}
              {adventure.isAdmin && (
                <button
                  onClick={() => createTeamMutation.mutate()}
                  disabled={createTeamMutation.isPending}
                  className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700"
                >
                  + 새 기수
                </button>
              )}
            </div>
          )}

          {/* 5.2.2/5.2.3: 기수를 탭으로 나누지 않고 세로로 나열, 이 영역 하나에서만 스크롤 */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {categoryId &&
              teams?.map((t) => (
                <RaidGenerationSection
                  key={t.id}
                  team={t}
                  categoryId={categoryId}
                  adventure={adventure}
                  registerSave={registerSave}
                />
              ))}
            {categoryId && teams?.length === 0 && (
              <p className="text-sm text-zinc-400">아직 생성된 기수가 없습니다.</p>
            )}
            {!categoryId && categories?.length === 0 && (
              <p className="text-sm text-zinc-400">
                아직 생성된 카테고리(하위탭)가 없습니다.
              </p>
            )}
          </div>
        </>
      )}

      {groupFormTarget && (
        <RaidGroupFormModal
          group={groupFormTarget === "new" ? undefined : groupFormTarget}
          onClose={() => setGroupFormTarget(null)}
        />
      )}

      {categoryFormTarget && groupId && (
        <RaidCategoryFormModal
          category={
            categoryFormTarget === "new" ? undefined : categoryFormTarget
          }
          groupId={groupId}
          onClose={() => setCategoryFormTarget(null)}
        />
      )}
    </div>
  );
}
