"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useCharacters, useMe } from "../../lib/hooks";
import { CharacterPanel } from "../../components/character/CharacterPanel";
import { RaidPanel } from "../../components/raid/RaidPanel";
import { ServerSelectBadge } from "../../components/ServerSelect";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";
import { logout as logoutApi } from "../../lib/api/auth";
import { reorderCharacters } from "../../lib/api/characters";
import { CharacterCard } from "../../lib/types";
import { logAction } from "../../lib/logging/logAction";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: adventure, isLoading: meLoading } = useMe();
  const { data: characters } = useCharacters();
  const draft = useRaidDraftStore();
  const [placedIds, setPlacedIds] = useState<Set<string>>(new Set());
  const [generationLabel, setGenerationLabel] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    // sessionStorage는 서버 렌더에 없는 브라우저 전용 API라 렌더 중 계산이 불가능 — 마운트 시 1회만 읽는다
    if (sessionStorage.getItem("bbot_onboarding") === "new") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboarding(true);
      sessionStorage.removeItem("bbot_onboarding");
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | { type: "character"; character: CharacterCard }
      | {
          type: "slot-character";
          slot: { id: string };
          character: CharacterCard;
        }
      | undefined;
    const overData = over.data.current as
      | { type: "slot"; slot: { id: string } }
      | { type: "character"; character: CharacterCard }
      | { type: "character-panel" }
      | undefined;
    if (!activeData) return;

    // 캐릭터 패널 목록 내 재정렬 (실시간 반영, 300ms 디바운스)
    if (
      activeData.type === "character" &&
      overData?.type === "character" &&
      active.id !== over.id &&
      characters
    ) {
      const oldIndex = characters.findIndex((c) => c.id === active.id);
      const newIndex = characters.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(characters, oldIndex, newIndex);
      queryClient.setQueryData(["characters"], reordered);
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(async () => {
        try {
          await reorderCharacters(reordered.map((c) => c.id));
          await logAction({
            actionType: "CHARACTER_REORDER",
            result: "SUCCESS",
          });
        } catch {
          await logAction({
            actionType: "CHARACTER_REORDER",
            result: "FAILURE",
          });
          await queryClient.invalidateQueries({ queryKey: ["characters"] });
        }
      }, 300);
      return;
    }

    // 캐릭터 패널 -> 공대표 슬롯 배치
    if (activeData.type === "character" && overData?.type === "slot") {
      draft.placeCharacter(overData.slot.id, activeData.character);
      return;
    }

    // 슬롯 -> 다른 슬롯으로 이동
    if (activeData.type === "slot-character" && overData?.type === "slot") {
      draft.placeCharacter(overData.slot.id, activeData.character);
      return;
    }

    // 슬롯 -> 캐릭터 패널로 드래그하면 배치 해제
    if (
      activeData.type === "slot-character" &&
      overData?.type === "character-panel"
    ) {
      draft.clearSlot(activeData.slot.id);
    }
  };

  if (meLoading || !adventure) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {adventure.name}
            </span>
            <ServerSelectBadge adventure={adventure} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {adventure.isAdmin && (
              <Link
                href="/admin/logs"
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                활동 로그
              </Link>
            )}
            <button
              onClick={async () => {
                await logoutApi();
                router.push("/login");
              }}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              로그아웃
            </button>
          </div>
        </header>

        {onboarding && (
          <div className="mx-4 mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            환영합니다, 새 모험단이 생성되었습니다. 왼쪽에서 캐릭터를 먼저
            등록해주세요.
            <button
              onClick={() => setOnboarding(false)}
              className="ml-2 underline"
            >
              닫기
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <CharacterPanel
            characters={characters ?? []}
            currentGenerationLabel={generationLabel}
            placedCharacterIds={placedIds}
          />
          <RaidPanel
            adventure={adventure}
            onSlotsChange={(ids, label) => {
              setPlacedIds(ids);
              setGenerationLabel(label);
            }}
          />
        </div>
      </div>
    </DndContext>
  );
}
