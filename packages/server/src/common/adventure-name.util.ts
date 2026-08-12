// 모험단 이름 검증: 한글 1자=2, 그 외 1자=1로 계산해 합계 16 이하 (프론트 adventureNameSchema와 동일 로직)
export function isValidAdventureName(name: string): boolean {
  if (name.length < 1) return false;
  const weightedLength = [...name].reduce(
    (acc, ch) => acc + (/[가-힣]/.test(ch) ? 2 : 1),
    0,
  );
  return weightedLength <= 16;
}
