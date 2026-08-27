// 파티에 버퍼가 정확히 1명이면 4번째 자리(slotInParty=3)에 자동으로 앉힌다. 2명 이상이면 이 규칙을
// 적용하지 않는다 — 크루세이더 등 버퍼 직업이 딜러로도 쓰이는 경우가 있어서, 버퍼가 여럿이면 어느 쪽이
// "자리 고정이 필요한 진짜 버퍼"인지 자동으로 판단할 수 없기 때문.
import type { RaidSlot } from "../types";

export function arrangeParty(slots: RaidSlot[], partyId: string): RaidSlot[] {
  const partySlots = slots.filter((s) => s.partyId === partyId);
  const buffers = partySlots.filter((s) => s.character?.role === "BUFFER");
  if (buffers.length !== 1) return slots;

  const buffer = buffers[0];
  const targetSlot = partySlots.find((s) => s.slotInParty === 3);
  if (!targetSlot || buffer.id === targetSlot.id) return slots;

  return slots.map((s) => {
    if (s.id === buffer.id) return { ...s, character: targetSlot.character };
    if (s.id === targetSlot.id) return { ...s, character: buffer.character };
    return s;
  });
}

export function arrangeAllParties(slots: RaidSlot[]): RaidSlot[] {
  const partyIds = [...new Set(slots.map((s) => s.partyId))];
  return partyIds.reduce((acc, partyId) => arrangeParty(acc, partyId), slots);
}
