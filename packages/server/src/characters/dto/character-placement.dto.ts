// 좌측 캐릭터 패널의 "배치됨" 배지용: 이 캐릭터가 어느 상위탭(그룹)의 어느 카테고리/기수에
// 배치돼 있는지. 그룹 내 유일 배치 규칙(raid-teams.service.ts)상 그룹당 최대 1개.
export interface CharacterPlacementDto {
  characterId: string;
  groupLabel: string;
  categoryLabel: string;
  generationLabel: string;
}
