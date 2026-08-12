"use client";

import { Modal } from "../Modal";
import { RaidSlot, RaidTeam } from "../../lib/types";

// 5.2.5: 좌측 "서버 최신본", 우측 "내 작업 내용"을 슬롯별로 비교해 보여준다.
// [가정] 슬롯 단위 개별 채택 UI 대신, "서버본으로 전체 교체" / "내 작업내용 유지 후 재시도" 두 버튼으로 단순화했다.
export function ConflictResolutionModal({
  latest,
  localSlots,
  onUseServer,
  onRetryWithLocal,
  onClose,
}: {
  latest: RaidTeam;
  localSlots: RaidSlot[];
  onUseServer: () => void;
  onRetryWithLocal: () => void;
  onClose: () => void;
}) {
  const localById = new Map(localSlots.map((s) => [s.id, s.character]));

  const diffRows = latest.slots.map((serverSlot) => {
    const localCharacter = localById.get(serverSlot.id) ?? null;
    const serverCharacter = serverSlot.character;
    let kind: "same" | "changed" = "same";
    if ((serverCharacter?.id ?? null) !== (localCharacter?.id ?? null))
      kind = "changed";
    return { slotId: serverSlot.id, serverCharacter, localCharacter, kind };
  });

  return (
    <Modal
      title="저장 충돌 — 다른 사용자가 먼저 저장했습니다"
      onClose={onClose}
      wide
    >
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <h3 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
            서버 최신본
          </h3>
          <div className="space-y-1">
            {diffRows.map((row) => (
              <div
                key={row.slotId}
                className={`rounded px-2 py-1 ${row.kind === "changed" ? "bg-amber-50 dark:bg-amber-950/40" : "bg-zinc-50 dark:bg-zinc-800"}`}
              >
                {row.serverCharacter?.name ?? (
                  <span className="text-zinc-400">빈 자리</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
            내 작업 내용
          </h3>
          <div className="space-y-1">
            {diffRows.map((row) => (
              <div
                key={row.slotId}
                className={`rounded px-2 py-1 ${row.kind === "changed" ? "bg-amber-50 dark:bg-amber-950/40" : "bg-zinc-50 dark:bg-zinc-800"}`}
              >
                {row.localCharacter?.name ?? (
                  <span className="text-zinc-400">빈 자리</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 text-sm">
        <button
          onClick={onUseServer}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
        >
          서버본으로 전체 교체
        </button>
        <button
          onClick={onRetryWithLocal}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          내 작업내용 유지 후 다시 저장
        </button>
      </div>
    </Modal>
  );
}
