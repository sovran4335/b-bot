"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CharacterCard as CharacterCardType } from "../../lib/types";

const ROLE_LABEL: Record<string, string> = { DEALER: "딜러", BUFFER: "버퍼" };

export function CharacterCard({
  character,
  placedAt,
  onEdit,
  onDelete,
}: {
  character: CharacterCardType;
  placedAt?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: character.id,
    data: { type: "character", character },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none px-1 text-zinc-400"
        aria-label="드래그 핸들"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
            {character.name}
          </span>
          <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {ROLE_LABEL[character.role]}
          </span>
        </div>
        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {character.job} · {character.score.toLocaleString()}
        </div>
        {placedAt && (
          <div className="truncate text-[10px] text-emerald-600 dark:text-emerald-400">
            배치됨 · {placedAt}
          </div>
        )}
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        수정
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 text-zinc-400 hover:text-red-600"
        aria-label="삭제"
      >
        🗑
      </button>
    </div>
  );
}
