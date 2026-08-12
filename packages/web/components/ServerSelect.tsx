"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { selectServer } from "../lib/api/auth";
import { Adventure, SERVER_LABELS, ServerId } from "../lib/types";

const SERVER_IDS = Object.keys(SERVER_LABELS) as ServerId[];

function ServerSelectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: selectServer,
    onSuccess: (adventure) => {
      queryClient.setQueryData(["me"], adventure);
      onClose();
    },
    // 5.0: 실패해도 조용히 토스트만, 기능 차단 없음 [가정: 토스트 생략, 인라인 에러로 대체]
  });

  return (
    <Modal title="서버 선택" onClose={onClose}>
      <div className="grid grid-cols-4 gap-2">
        {SERVER_IDS.map((id) => (
          <button
            key={id}
            onClick={() => mutation.mutate(id)}
            disabled={mutation.isPending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
          >
            {SERVER_LABELS[id]}
          </button>
        ))}
      </div>
      {mutation.isError && (
        <p className="mt-2 text-xs text-red-600">서버 선택에 실패했습니다.</p>
      )}
    </Modal>
  );
}

// 5.0: 서버 미설정 배너. 모달로 막지 않고, 배지/배너로만 안내한다.
export function ServerSelectBadge({ adventure }: { adventure: Adventure }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false); // 이 화면 방문 동안만 숨김 [가정]

  return (
    <>
      {adventure.serverId ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {SERVER_LABELS[adventure.serverId]}
        </button>
      ) : (
        !dismissed && (
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <button
              onClick={() => setOpen(true)}
              className="font-medium underline"
            >
              플레이 중인 서버를 선택해주세요
            </button>
            <button onClick={() => setDismissed(true)} aria-label="닫기">
              ✕
            </button>
          </div>
        )
      )}
      {open && <ServerSelectModal onClose={() => setOpen(false)} />}
    </>
  );
}
