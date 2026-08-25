// 5.2.5: 현재 열람 중인 기수의 로컬 드래프트(슬롯 배치)와 baseVersion을 들고 있는 스토어.
// 서버 상태(React Query)와 분리된 "편집 중" 상태만 다룬다.
import { create } from "zustand";
import { RaidSlot, RaidTeam } from "../types";

type SlotCharacter = NonNullable<RaidSlot["character"]>;

interface RaidDraftState {
  teamId: string | null;
  baseVersion: number;
  slots: RaidSlot[];
  dirty: boolean;
  loadTeam: (team: RaidTeam) => void;
  placeCharacter: (slotId: string, character: SlotCharacter) => void;
  clearSlot: (slotId: string) => void;
  applyServerSlots: (team: RaidTeam) => void; // 저장 성공/충돌 해소 후 서버본으로 동기화
  bumpBaseVersion: (version: number) => void; // 충돌 재시도 시 baseVersion만 최신화 (내 작업 내용은 유지)
}

export const useRaidDraftStore = create<RaidDraftState>((set) => ({
  teamId: null,
  baseVersion: 0,
  slots: [],
  dirty: false,

  loadTeam: (team) =>
    set({
      teamId: team.id,
      baseVersion: team.version,
      slots: team.slots.map((s) => ({ ...s })),
      dirty: false,
    }),

  placeCharacter: (slotId, character) =>
    set((state) => ({
      dirty: true,
      slots: state.slots.map((s) => {
        if (s.id === slotId) return { ...s, character };
        // 같은 캐릭터가 다른 슬롯에 이미 있으면 그 자리는 비운다(이동)
        if (s.character?.id === character.id) return { ...s, character: null };
        return s;
      }),
    })),

  clearSlot: (slotId) =>
    set((state) => ({
      dirty: true,
      slots: state.slots.map((s) =>
        s.id === slotId ? { ...s, character: null } : s,
      ),
    })),

  applyServerSlots: (team) =>
    set({
      teamId: team.id,
      baseVersion: team.version,
      slots: team.slots.map((s) => ({ ...s })),
      dirty: false,
    }),

  bumpBaseVersion: (version) => set({ baseVersion: version }),
}));
