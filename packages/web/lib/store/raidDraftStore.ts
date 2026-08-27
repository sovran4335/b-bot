// 5.2.5: 화면에 여러 기수 보드가 동시에 떠있으므로(탭 대신 스크롤로 나열), 기수(teamId)별로
// 로컬 드래프트(슬롯 배치)와 baseVersion을 따로 든다. 서버 상태(React Query)와 분리된 "편집 중" 상태만 다룬다.
import { create } from "zustand";
import { RaidSlot, RaidTeam } from "../types";

type SlotCharacter = NonNullable<RaidSlot["character"]>;

interface TeamDraft {
  baseVersion: number;
  slots: RaidSlot[];
  dirty: boolean;
}

interface RaidDraftState {
  drafts: Record<string, TeamDraft>;
  loadTeam: (team: RaidTeam) => void;
  // sourceTeamId: 다른 기수 보드에서 드래그해온 경우 그쪽 슬롯도 함께 비운다 (기수간 이동)
  placeCharacter: (
    teamId: string,
    slotId: string,
    character: SlotCharacter,
    sourceTeamId?: string,
  ) => void;
  clearSlot: (teamId: string, slotId: string) => void;
  applyServerSlots: (team: RaidTeam) => void; // 저장 성공/충돌 해소 후 서버본으로 동기화
  bumpBaseVersion: (teamId: string, version: number) => void; // 충돌 재시도 시 baseVersion만 최신화
}

export const useRaidDraftStore = create<RaidDraftState>((set) => ({
  drafts: {},

  loadTeam: (team) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [team.id]: {
          baseVersion: team.version,
          slots: team.slots.map((s) => ({ ...s })),
          dirty: false,
        },
      },
    })),

  placeCharacter: (teamId, slotId, character, sourceTeamId) =>
    set((state) => {
      const drafts = { ...state.drafts };

      if (sourceTeamId && sourceTeamId !== teamId && drafts[sourceTeamId]) {
        drafts[sourceTeamId] = {
          ...drafts[sourceTeamId],
          dirty: true,
          slots: drafts[sourceTeamId].slots.map((s) =>
            s.character?.id === character.id ? { ...s, character: null } : s,
          ),
        };
      }

      const target = drafts[teamId];
      if (!target) return { drafts };
      drafts[teamId] = {
        ...target,
        dirty: true,
        slots: target.slots.map((s) => {
          if (s.id === slotId) return { ...s, character };
          // 같은 캐릭터가 같은 기수의 다른 슬롯에 이미 있으면 그 자리는 비운다(이동)
          if (s.character?.id === character.id) return { ...s, character: null };
          return s;
        }),
      };
      return { drafts };
    }),

  clearSlot: (teamId, slotId) =>
    set((state) => {
      const target = state.drafts[teamId];
      if (!target) return {};
      return {
        drafts: {
          ...state.drafts,
          [teamId]: {
            ...target,
            dirty: true,
            slots: target.slots.map((s) =>
              s.id === slotId ? { ...s, character: null } : s,
            ),
          },
        },
      };
    }),

  applyServerSlots: (team) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [team.id]: {
          baseVersion: team.version,
          slots: team.slots.map((s) => ({ ...s })),
          dirty: false,
        },
      },
    })),

  bumpBaseVersion: (teamId, version) =>
    set((state) => {
      const target = state.drafts[teamId];
      if (!target) return {};
      return {
        drafts: {
          ...state.drafts,
          [teamId]: { ...target, baseVersion: version },
        },
      };
    }),
}));
