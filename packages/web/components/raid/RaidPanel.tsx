"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRaidCategories } from "../../lib/hooks";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";
import {
  getRaidTeam,
  listRaidTeams,
  createRaidTeam,
  deleteRaidTeam,
  saveRaidTeam,
} from "../../lib/api/raidTeams";
import { deleteRaidCategory } from "../../lib/api/raidCategories";
import { ApiError } from "../../lib/api/client";
import { Adventure, RaidCategory, RaidTeam } from "../../lib/types";
import {
  usePartyCompositionRule,
  validateRaidTeam,
} from "../../lib/validation/partyComposition";
import { RaidBoard } from "./RaidBoard";
import { RaidCategoryFormModal } from "./RaidCategoryFormModal";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { logAction } from "../../lib/logging/logAction";

export function RaidPanel({
  adventure,
  onSlotsChange,
}: {
  adventure: Adventure;
  // 좌측 캐릭터 패널의 "배치됨" 배지 표시용으로 현재 보드의 배치 캐릭터 id를 올려보낸다
  onSlotsChange: (
    placedIds: Set<string>,
    generationLabel: string | null,
  ) => void;
}) {
  const queryClient = useQueryClient();
  const { data: categories } = useRaidCategories();
  // 명시적으로 고른 탭/기수가 없거나(또는 삭제 등으로 더 이상 존재하지 않으면) 첫 번째 항목으로 렌더링 중 계산한다
  // (effect + setState로 "기본 선택"을 흉내내지 않는다)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [categoryFormTarget, setCategoryFormTarget] = useState<
    "new" | RaidCategory | null
  >(null);
  const [conflict, setConflict] = useState<RaidTeam | null>(null);
  const rule = usePartyCompositionRule();
  const draft = useRaidDraftStore();

  const categoryId =
    (selectedCategoryId && categories?.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : null) ??
    categories?.[0]?.id ??
    null;

  const { data: teams } = useQuery({
    queryKey: ["raid-teams", categoryId],
    queryFn: () => listRaidTeams(categoryId!),
    enabled: !!categoryId,
  });

  const teamId =
    (selectedTeamId && teams?.some((t) => t.id === selectedTeamId)
      ? selectedTeamId
      : null) ??
    teams?.[0]?.id ??
    null;

  const { data: teamDetail } = useQuery({
    queryKey: ["raid-team", teamId],
    queryFn: () => getRaidTeam(teamId!),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamDetail) draft.loadTeam(teamDetail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamDetail]);

  useEffect(() => {
    const placed = new Set(
      draft.slots.filter((s) => s.character).map((s) => s.character!.id),
    );
    onSlotsChange(placed, teamDetail?.generationLabel ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.slots, teamDetail?.generationLabel]);

  const createTeamMutation = useMutation({
    mutationFn: () => createRaidTeam(categoryId!),
    onSuccess: async (team) => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      setSelectedTeamId(team.id);
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

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => deleteRaidTeam(id),
    onSuccess: async (_d, id) => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      setSelectedTeamId(null);
      await logAction({
        actionType: "RAID_TEAM_DELETE",
        result: "SUCCESS",
        targetType: "RaidTeam",
        targetId: id,
      });
    },
    onError: () =>
      logAction({ actionType: "RAID_TEAM_DELETE", result: "FAILURE" }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteRaidCategory(id),
    onSuccess: async (_d, id) => {
      await queryClient.invalidateQueries({ queryKey: ["raid-categories"] });
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

  const saveMutation = useMutation({
    mutationFn: () =>
      saveRaidTeam(
        draft.teamId!,
        draft.baseVersion,
        draft.slots.map((s) => ({
          slotId: s.id,
          characterId: s.character?.id ?? null,
        })),
      ),
    onSuccess: async (team) => {
      draft.applyServerSlots(team);
      queryClient.setQueryData(["raid-team", team.id], team);
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      await logAction({
        actionType: "RAID_TEAM_SAVE",
        result: "SUCCESS",
        targetType: "RaidTeam",
        targetId: team.id,
        metadata: { conflict: false },
      });
    },
    onError: async (err) => {
      if (
        err instanceof ApiError &&
        err.body.errorCode === "RAID_TEAM_VERSION_CONFLICT"
      ) {
        setConflict(
          (err.body.details as { latestRaidTeam: RaidTeam }).latestRaidTeam,
        );
      }
      await logAction({
        actionType: "RAID_TEAM_SAVE",
        result: "FAILURE",
        targetType: "RaidTeam",
        targetId: draft.teamId ?? undefined,
        metadata: {
          conflict:
            err instanceof ApiError &&
            err.body.errorCode === "RAID_TEAM_VERSION_CONFLICT",
        },
      });
    },
  });

  const selectedCategory = categories?.find((c) => c.id === categoryId) ?? null;
  const { partyIssues, duplicateAdventures } = teamDetail
    ? validateRaidTeam(draft.slots, [], rule)
    : { partyIssues: {}, duplicateAdventures: [] };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 5.2.1: 탭 */}
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

      {/* 5.2.2: 기수 선택 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {teams?.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTeamId(t.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              t.id === teamId
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {t.generationLabel}
            {adventure.isAdmin && t.id === teamId && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${t.generationLabel}"를 삭제할까요?`))
                    deleteTeamMutation.mutate(t.id);
                }}
                className="ml-1.5 opacity-70 hover:opacity-100"
              >
                ✕
              </span>
            )}
          </button>
        ))}
        {adventure.isAdmin && categoryId && (
          <button
            onClick={() => createTeamMutation.mutate()}
            disabled={createTeamMutation.isPending}
            className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700"
          >
            + 새 기수
          </button>
        )}
        {teams?.length === 0 && (
          <p className="text-xs text-zinc-400">아직 생성된 기수가 없습니다.</p>
        )}
      </div>

      {/* 5.2.4: 유효성 배너 */}
      {duplicateAdventures.length > 0 && (
        <div className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          동일 모험단이 중복 배치되어 있습니다:{" "}
          {duplicateAdventures
            .map((d) => d.characterNames.join(", "))
            .join(" / ")}
        </div>
      )}

      {/* 5.2.3: 보드 */}
      <div className="flex-1 overflow-y-auto p-3">
        {teamDetail ? (
          <RaidBoard
            parties={teamDetail.parties}
            slots={draft.slots}
            partyIssues={partyIssues}
          />
        ) : (
          <p className="text-sm text-zinc-400">
            {teams?.length
              ? "기수를 선택해주세요."
              : "기수를 먼저 생성해주세요."}
          </p>
        )}
      </div>

      {teamDetail && (
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          {draft.dirty && (
            <span className="text-xs text-amber-600">
              저장하지 않은 변경사항이 있습니다.
            </span>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !draft.dirty}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      )}

      {categoryFormTarget && (
        <RaidCategoryFormModal
          category={
            categoryFormTarget === "new" ? undefined : categoryFormTarget
          }
          onClose={() => setCategoryFormTarget(null)}
        />
      )}

      {conflict && (
        <ConflictResolutionModal
          latest={conflict}
          localSlots={draft.slots}
          onClose={() => setConflict(null)}
          onUseServer={() => {
            draft.applyServerSlots(conflict);
            queryClient.setQueryData(["raid-team", conflict.id], conflict);
            setConflict(null);
          }}
          onRetryWithLocal={() => {
            draft.bumpBaseVersion(conflict.version);
            setConflict(null);
            saveMutation.mutate();
          }}
        />
      )}
    </div>
  );
}
