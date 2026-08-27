"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { PartyDefinition, RaidSlot } from "../../lib/types";
import { PartyValidationIssue } from "../../lib/validation/partyComposition";
import { CharacterAvatar } from "../character/CharacterAvatar";
import CharacterTypeIcon from "../character/CharacterTypeIcon";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";

function RaidSlotCell({ slot, teamId }: { slot: RaidSlot; teamId: string }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: slot.id,
    data: { type: "slot", slot, teamId },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `slotchar:${slot.id}`,
    data: slot.character
      ? { type: "slot-character", slot, character: slot.character, teamId }
      : undefined,
    disabled: !slot.character,
  });
  const clearSlot = useRaidDraftStore((s) => s.clearSlot);
  return (
    <div
      ref={setDropRef}
      className={`flex h-20 items-center rounded-lg border px-2 text-xs ${
        isOver
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-dashed border-zinc-300 dark:border-zinc-700"
      } ${slot.character ? "border-solid bg-white dark:bg-zinc-800" : ""}`}
    >
      {slot.character ? (
        <>
          <div
            ref={setDragRef}
            {...attributes}
            {...listeners}
            className={`flex min-w-0 flex-1 items-center gap-2 cursor-grab touch-none ${isDragging ? "opacity-40" : ""}`}
          >
            <button
              className="cursor-grab touch-none px-0.5 text-zinc-400"
              aria-label="드래그 핸들"
            >
              ⠿
            </button>
            <div className="border border-zinc-600 rounded-lg relative">
              {
                slot.character.adventureName && (
                  <span className="absolute whitespace-nowrap -translate-y-1/2 left-1/2 -translate-x-1/2 z-1 rounded border-zinc-600 border bg-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {slot.character.adventureName}
                  </span>
                )
              }
              <CharacterAvatar
                serverId={slot.character.serverId}
                officialCharacterId={slot.character.officialCharacterId}
                jobId={slot.character.jobId}
                className="!bg-black"
              />
            </div>
            <div className="min-w-0 flex-1 ml-2">
              <span className="truncate text-[14px] font-medium text-zinc-900 dark:text-zinc-50">
                {slot.character.name}
              </span>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {slot.character.job}
              </div>
              <div className="flex items-center gap-1">
                <CharacterTypeIcon jobType={slot.character.role} />
                <span className="truncate text-[12px] font-bold text-[#3392ff]">
                  {slot.character.score.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => clearSlot(teamId, slot.id)}
            className="shrink-0 px-1 text-zinc-400 hover:text-red-600"
            aria-label="현재 기수에서 제거"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="text-zinc-400">빈 자리</span>
      )}
    </div>
  );
}

// 파티(레드/옐로/그린 등)의 평균 장비점수. 버퍼는 score가 "버프력"이라 장비점수 평균에 섞으면
// 의미가 왜곡되므로 딜러만 집계한다 [가정]. 딜러가 하나도 없으면 표시하지 않는다.
function averageDealerScore(slots: RaidSlot[]): number | null {
  const scores = slots
    .filter((s) => s.character && s.character.role === "DEALER")
    .map((s) => s.character!.score);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function RaidPartyGroup({
  party,
  slots,
  issues,
  teamId,
}: {
  party: PartyDefinition;
  slots: RaidSlot[];
  issues: PartyValidationIssue[];
  teamId: string;
}) {
  const avgScore = averageDealerScore(slots);
  return (
    <div className="min-w-[280px] rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: party.colorHex ?? "#a1a1aa" }}
        />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {party.label}
        </span>
        {issues.length > 0 && (
          <span
            title={issues.map((i) => i.message).join(" / ")}
            className="text-amber-500"
          >
            ⚠
          </span>
        )}
        {avgScore !== null && (
          <div className="ml-auto flex gap-1 items-center">
            <img src="/ico_equi.png" className="w-[15px] h-[15px]" />
            <span className="text-[13px] font-bold text-[#3392ff]">{avgScore.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {slots
          .sort((a, b) => a.slotInParty - b.slotInParty)
          .map((slot) => (
            <RaidSlotCell key={slot.id} slot={slot} teamId={teamId} />
          ))}
      </div>
    </div>
  );
}

export function RaidBoard({
  teamId,
  parties,
  slots,
  partyIssues,
}: {
  teamId: string;
  parties: PartyDefinition[];
  slots: RaidSlot[];
  partyIssues: Record<string, PartyValidationIssue[]>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {parties
        .sort((a, b) => a.order - b.order)
        .map((party) => (
          <RaidPartyGroup
            key={party.id}
            party={party}
            slots={slots.filter((s) => s.partyId === party.id)}
            issues={partyIssues[party.id] ?? []}
            teamId={teamId}
          />
        ))}
      {parties.length === 0 && (
        <p className="text-sm text-zinc-400">
          이 카테고리에 파티 구성이 없습니다.
        </p>
      )}
    </div>
  );
}
