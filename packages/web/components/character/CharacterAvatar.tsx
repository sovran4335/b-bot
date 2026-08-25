import { ServerId } from "../../lib/types";
import { JobId } from "../../lib/jobCategories";

// 던파 공식 이미지 API — 서버+캐릭터 고유 id가 둘 다 있어야 그릴 수 있다.
// 캐릭터 목록/등록·갱신 미리보기/공대표 카드에서 공용으로 쓰는 초상화.
const IMG_BASE = "https://img-api.neople.co.kr/df/servers";

export function characterImageUrl(
  serverId: ServerId | null | undefined,
  officialCharacterId: string | null | undefined,
): string | null {
  if (!serverId || !officialCharacterId) return null;
  return `${IMG_BASE}/${serverId}/characters/${officialCharacterId}`;
}

// 직업(jobId)마다 초상화 원본 내 캐릭터 위치가 조금씩 달라서 필요한 것만 여기 채워
// 넣으면 된다 — 없는 jobId는 보정 없이(0, 0) 중앙 정렬 그대로 나간다.
// 단위 px, 기본(중앙 정렬) 기준 추가로 이동시키는 값 (+x 오른쪽, +y 아래).
export const JOB_AVATAR_OFFSET: Partial<Record<JobId, { x: number; y: number }>> =
  {
    // 예: b9cb48777665de22c006fabaf9a560b3(아처): { x: 0, y: -4 },
    "41f1cdc2ff58bb5fdc287be0db2a8df3": { x: 0, y: 3.6 }, // 귀검사(남)
    "17e417b31686389eebff6d754c3401ea": { x: 0, y: 3.6 }, // 다크나이트

    "a7a059ebe9e6054c0644b40ef316d6e9": { x: 0.2, y: 1.5 }, // 격투가(여)
    "afdf3b989339de478e85b614d274d1ef": { x: 0.5, y: 6 }, // 거너(남)

    "3909d0b188e9c95311399f776e331da5": { x: 0.4, y: -1.2 }, // 마법사(여)
    "b522a95d819a5559b775deb9a490e49a": { x: 0.4, y: -1.2 }, // 크리에이터

    "f6a4ad30555b99b499c07835f87ce522": { x: 0, y: 5 }, // 프리스트(남)
    "944b9aab492c15a8474f96947ceeb9e4": { x: 0.3, y: 4 }, // 거너(여)
    "ddc49e9ad1ff72a00b53c6cff5b1e920": { x: 0.3, y: 4 }, // 도적
    "ca0f0e0e9e1d55b5f9955b03d9dd213c": { x: 0.8, y: 4 }, // 격투가(남)
    "a5ccbaf5538981c6ef99b236c0a60b73": { x: 0.5, y: 1 }, // 마법사(남)
    
    "b9cb48777665de22c006fabaf9a560b3": { x: 1.5, y: 0 }, // 아처  
    "1645c45aabb008c98406b3a16447040d": { x: 0.4, y: 2 }, // 귀검사(여)  
    "0ee8fa5dc525c1a1f23fc6911e921e4a": { x: 0.5, y: 0 }, // 나이트
    "3deb7be5f01953ac8b1ecaa1e25e0420": { x: 1, y: 4 }, // 마창사
    "0c1b401bb09241570d364420b3ba3fd7": { x: 0.5, y: 2 }, // 프리스트(여)
    "986c2b3d72ee0e4a0b7fcfbe786d4e02": { x: 0, y: 4.8 }, // 총검사
    "8d4d2001cdb357e41633c234eb7501b5": { x: 0.5, y: 2.5 }, // 제국기사
  };

function getAvatarOffset(jobId: string | null | undefined) {
  return (jobId && JOB_AVATAR_OFFSET[jobId as JobId]) || { x: 0, y: 0 };
}

export function CharacterAvatar({
  serverId,
  officialCharacterId,
  jobId,
  size = 40,
  className = "",
}: {
  serverId: ServerId | null | undefined;
  officialCharacterId: string | null | undefined;
  jobId?: string | null;
  size?: number;
  className?: string;
}) {
  const src = characterImageUrl(serverId, officialCharacterId);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-700 ${className}`}
      />
    );
  }

  const offset = getAvatarOffset(jobId);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0  overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 외부(neople) 이미지, next/image 도메인 화이트리스트 늘릴 필요 없이 그냥 img로 충분 */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover scale-600"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
    </div>
  );
}
