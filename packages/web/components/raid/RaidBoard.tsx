"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { PartyDefinition, RaidSlot } from "../../lib/types";
import { PartyValidationIssue } from "../../lib/validation/partyComposition";
import { CharacterAvatar } from "../character/CharacterAvatar";
import CharacterTypeIcon from "../character/CharacterTypeIcon";
import { useRaidDraftStore } from "../../lib/store/raidDraftStore";

function RaidSlotCell({ slot }: { slot: RaidSlot }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: slot.id,
    data: { type: "slot", slot },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `slotchar:${slot.id}`,
    data: slot.character
      ? { type: "slot-character", slot, character: slot.character }
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
            onClick={() => clearSlot(slot.id)}
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

function RaidPartyGroup({
  party,
  slots,
  issues,
}: {
  party: PartyDefinition;
  slots: RaidSlot[];
  issues: PartyValidationIssue[];
}) {
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
      </div>
      <div className="space-y-1.5">
        {slots
          .sort((a, b) => a.slotInParty - b.slotInParty)
          .map((slot) => (
            <RaidSlotCell key={slot.id} slot={slot} />
          ))}
      </div>
    </div>
  );
}

export function RaidBoard({
  parties,
  slots,
  partyIssues,
}: {
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
