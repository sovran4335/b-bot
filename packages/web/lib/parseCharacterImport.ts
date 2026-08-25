// 넥슨 "마이캐릭터" 페이지를 그대로 복사-붙여넣기 하면 오는 텍스트를 파싱한다.
// 패턴: "Lv.115" 줄 다음에 이름 줄, 그 다음에 직업 줄이 캐릭터 수만큼 반복된다.
// 진(眞) 각성 캐릭터는 직업명 앞에 "진(眞) " 접두어가 붙으므로 제거한다.

const LEVEL_LINE = /^Lv\.\d+$/;
const AWAKENING_PREFIX = /^진\(眞\)\s*/;

export interface ParsedCharacter {
  name: string;
  job: string;
}

export function parseCharacterImport(raw: string): ParsedCharacter[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ParsedCharacter[] = [];
  for (let i = 0; i < lines.length - 2; i++) {
    if (!LEVEL_LINE.test(lines[i])) continue;
    const name = lines[i + 1];
    const job = lines[i + 2].replace(AWAKENING_PREFIX, "");
    if (LEVEL_LINE.test(name) || LEVEL_LINE.test(job)) continue; // 오탐 방지
    result.push({ name, job });
    i += 2; // 소비한 세 줄(Lv/이름/직업) 건너뛰기
  }
  return result;
}

const BUFFER_JOBS = ["크루세이더", "인챈트리스", "패러메딕", "뮤즈"];

export function inferRole(job: string): "DEALER" | "BUFFER" {
  return BUFFER_JOBS.some((buffJob) => job.includes(buffJob))
    ? "BUFFER"
    : "DEALER";
}
