"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CharacterCard as CharacterCardType } from "../../lib/types";
import { CharacterCard } from "./CharacterCard";
import { CharacterFormModal } from "./CharacterFormModal";
import { CharacterImportModal } from "./CharacterImportModal";
import { CharacterRefreshModal } from "./CharacterRefreshModal";
import { deleteCharacter } from "../../lib/api/characters";
import { logAction } from "../../lib/logging/logAction";

export function CharacterPanel({
  characters,
  currentGenerationLabel,
  placedCharacterIds,
}: {
  characters: CharacterCardType[];
  currentGenerationLabel: string | null;
  // [가정] 배치 여부는 현재 열어본 기수 기준으로만 표시한다. 전체 기수 대상 배치 조회 API가 스펙에 없어
  // 캐릭터 전체를 모든 카테고리/기수에 대해 스캔하는 비용을 피했다.
  placedCharacterIds: Set<string>;
}) {
  const [editTarget, setEditTarget] = useState<CharacterCardType | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CharacterCardType | null>(
    null,
  );
  const { setNodeRef } = useDroppable({
    id: "character-panel",
    data: { type: "character-panel" },
  });
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
      await queryClient.invalidateQueries({ queryKey: ["raid-team"] }); // 슬롯 해제 반영
      await logAction({
        actionType: "CHARACTER_DELETE",
        result: "SUCCESS",
        targetType: "Character",
        targetId: id,
      });
      setPendingDelete(null);
    },
    onError: async () => {
      await logAction({ actionType: "CHARACTER_DELETE", result: "FAILURE" });
    },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between p-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          내 캐릭터
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setImportOpen(true)}
            className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            + 캐릭터 등록
          </button>
          <button
            onClick={() => setRefreshOpen(true)}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            캐릭터 갱신
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext
          items={characters.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              placedAt={
                placedCharacterIds.has(c.id) ? currentGenerationLabel : null
              }
              onEdit={() => setEditTarget(c)}
              onDelete={() => setPendingDelete(c)}
            />
          ))}
        </SortableContext>
        {characters.length === 0 && (
          <p className="p-4 text-center text-xs text-zinc-400">
            등록된 캐릭터가 없습니다.
          </p>
        )}
      </div>

      {editTarget && (
        <CharacterFormModal
          character={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {importOpen && (
        <CharacterImportModal onClose={() => setImportOpen(false)} />
      )}

      {refreshOpen && (
        <CharacterRefreshModal onClose={() => setRefreshOpen(false)} />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
            <p className="text-sm text-zinc-800 dark:text-zinc-100">
              <b>{pendingDelete.name}</b> 캐릭터를 삭제할까요? 배치된 공대표
              슬롯도 함께 비워집니다.
            </p>
            <div className="mt-4 flex justify-end gap-2 text-sm">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 text-zinc-500"
              >
                취소
              </button>
              <button
                onClick={() => deleteMutation.mutate(pendingDelete.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-white disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
