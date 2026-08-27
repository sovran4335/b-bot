// 여러 컴포넌트가 공유하는 쿼리만 훅으로 분리한다 (캐릭터 목록, 카테고리 목록, 내 정보).
import { useQuery } from "@tanstack/react-query";
import { getMe } from "./api/auth";
import { listCharacters, getCharacterPlacements } from "./api/characters";
import { listRaidGroups } from "./api/raidGroups";
import { listRaidCategories } from "./api/raidCategories";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: getMe });

export const useCharacters = () =>
  useQuery({ queryKey: ["characters"], queryFn: listCharacters });

export const useCharacterPlacements = () =>
  useQuery({
    queryKey: ["character-placements"],
    queryFn: getCharacterPlacements,
  });

export const useRaidGroups = () =>
  useQuery({ queryKey: ["raid-groups"], queryFn: listRaidGroups });

export const useRaidCategories = (groupId: string | null) =>
  useQuery({
    queryKey: ["raid-categories", groupId],
    queryFn: () => listRaidCategories(groupId!),
    enabled: !!groupId,
  });
