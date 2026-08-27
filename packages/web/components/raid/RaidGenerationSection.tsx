"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";
import { getRaidTeam, saveRaidTeam, deleteRaidTeam } from "../../lib/api/raidTeams";
import { ApiError } from "../../lib/api/client";
import { Adventure, RaidTeam, RaidTeamSummary } from "../../lib/types";
import {
  usePartyCompositionRule,
  validateRaidTeam,
} from "../../lib/validation/partyComposition";
import { RaidBoard } from "./RaidBoard";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { logAction } from "../../lib/logging/logAction";

// 탭으로 기수를 하나씩 골라 보던 것 대신, 카테고리 안의 모든 기수를 세로로 나열하고 스크롤로
// 넘긴다. 기수마다 자기 데이터/드래프트/저장을 독립적으로 들고 있어야 해서 RaidPanel에서
// 분리했다 (전엔 전역 draft 하나가 "현재 보고 있는 기수" 하나만 표현했음, 5.2.5 참고).
export function RaidGenerationSection({
  team,
  categoryId,
  adventure,
  registerSave,
}: {
  team: RaidTeamSummary;
  categoryId: string;
  adventure: Adventure;
  // "일괄 저장" 버튼이 dirty한 기수만 골라 트리거할 수 있도록, 마운트 시 자기 저장 함수를 위(RaidPanel)에 등록해둔다
  registerSave?: (teamId: string, save: () => void) => void;
}) {
  const queryClient = useQueryClient();
  const rule = usePartyCompositionRule();
  const draftEntry = useRaidDraftStore((s) => s.drafts[team.id]);
  const loadTeam = useRaidDraftStore((s) => s.loadTeam);
  const applyServerSlots = useRaidDraftStore((s) => s.applyServerSlots);
  const bumpBaseVersion = useRaidDraftStore((s) => s.bumpBaseVersion);
  const [conflict, setConflict] = useState<RaidTeam | null>(null);

  const { data: teamDetail } = useQuery({
    queryKey: ["raid-team", team.id],
    queryFn: () => getRaidTeam(team.id),
  });

  useEffect(() => {
    if (teamDetail) loadTeam(teamDetail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamDetail]);

  const deleteTeamMutation = useMutation({
    mutationFn: () => deleteRaidTeam(team.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      await logAction({
        actionType: "RAID_TEAM_DELETE",
        result: "SUCCESS",
        targetType: "RaidTeam",
        targetId: team.id,
      });
    },
    onError: () =>
      logAction({ actionType: "RAID_TEAM_DELETE", result: "FAILURE" }),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveRaidTeam(
        team.id,
        draftEntry!.baseVersion,
        draftEntry!.slots.map((s) => ({
          slotId: s.id,
          characterId: s.character?.id ?? null,
        })),
      ),
    onSuccess: async (saved) => {
      applyServerSlots(saved);
      queryClient.setQueryData(["raid-team", team.id], saved);
      await queryClient.invalidateQueries({
        queryKey: ["raid-teams", categoryId],
      });
      // 그룹 내 유일 배치 규칙상 서버가 다른 기수의 슬롯을 함께 비웠을 수 있어 배치 배지도 갱신
      await queryClient.invalidateQueries({
        queryKey: ["character-placements"],
      });
      await logAction({
        actionType: "RAID_TEAM_SAVE",
        result: "SUCCESS",
        targetType: "RaidTeam",
        targetId: saved.id,
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
        targetId: team.id,
        metadata: {
          conflict:
            err instanceof ApiError &&
            err.body.errorCode === "RAID_TEAM_VERSION_CONFLICT",
        },
      });
    },
  });

  useEffect(() => {
    registerSave?.(team.id, () => saveMutation.mutate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, registerSave]);

  if (!teamDetail || !draftEntry) {
    return (
      <div className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-400 dark:border-zinc-800">
        {team.generationLabel} 불러오는 중...
      </div>
    );
  }

  const { partyIssues, duplicateAdventures } = validateRaidTeam(
    draftEntry.slots,
    [],
    rule,
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {team.generationLabel}
        </h3>
        <div className="flex items-center gap-2">
          {draftEntry.dirty && (
            <span className="text-xs text-amber-600">
              저장하지 않은 변경사항이 있습니다.
            </span>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !draftEntry.dirty}
            className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </button>
          {adventure.isAdmin && (
            <button
              onClick={() => {
                if (confirm(`"${team.generationLabel}"를 삭제할까요?`))
                  deleteTeamMutation.mutate();
              }}
              className="text-xs text-zinc-400 hover:text-red-600"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {duplicateAdventures.length > 0 && (
        <div className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          동일 모험단이 중복 배치되어 있습니다:{" "}
          {duplicateAdventures
            .map((d) => d.characterNames.join(", "))
            .join(" / ")}
        </div>
      )}

      <div className="p-3">
        <RaidBoard
          teamId={team.id}
          parties={teamDetail.parties}
          slots={draftEntry.slots}
          partyIssues={partyIssues}
        />
      </div>

      {conflict && (
        <ConflictResolutionModal
          latest={conflict}
          localSlots={draftEntry.slots}
          onClose={() => setConflict(null)}
          onUseServer={() => {
            applyServerSlots(conflict);
            queryClient.setQueryData(["raid-team", conflict.id], conflict);
            setConflict(null);
          }}
          onRetryWithLocal={() => {
            bumpBaseVersion(team.id, conflict.version);
            setConflict(null);
            saveMutation.mutate();
          }}
        />
      )}
    </div>
  );
}
