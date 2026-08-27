# 던전앤파이터 공대표 서비스 — 프론트엔드 구현 지시서

> 이 문서는 `b-bot` 모노레포(pnpm + turborepo, `packages/*`) 중 프론트엔드(`packages/web` 가정)
> 구현을 AI 코딩 에이전트에게 지시하기 위한 스펙입니다.
> 아래 결정 사항은 프로젝트 오너와 확인을 거쳐 확정된 내용입니다.

---

## 0. 확정된 결정 사항 (Decisions)

| #    | 항목                  | 결정 내용                                                                                                                                                                                                                                                                                                                                                                   | 비고                                                                                                                                |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| D1   | 로그인 보안           | 모험단 이름만으로 로그인, 추가 보안 조치 없음 (의도된 정책)                                                                                                                                                                                                                                                                                                                 | 비밀번호/OAuth 등 추후 확장 여지는 남겨두되, 현재는 순수 이름 기반 로그인만 구현                                                    |
| D2   | 관리자 승격           | 관리자 승격은 디스코드 봇 명령어 또는 DB 직접 조작으로만 이루어짐                                                                                                                                                                                                                                                                                                           | 프론트에는 승격/강등 UI를 구현하지 않는다. `isAdmin` 필드를 신뢰하고 UI 분기만 수행                                                 |
| D3   | 공대표-서버 관계      | 서버(`serverId`)는 모험단에 귀속된 **저장용/식별용 태그**일 뿐, 공대표(기수)의 구성이나 캐릭터 드래그 가능 여부를 제한하지 않는다                                                                                                                                                                                                                                           | 추후 던파 공식 API 연동 시 캐릭터 검색을 좁히는 용도로 사용 예정. 공대표는 서버에 종속되지 않으며, 기수 생성 시 서버 선택 UI도 없음 |
| D3-1 | 서버 선택 시점        | 로그인 폼은 모험단 이름만 받는다. 서버 선택은 **대시보드 진입 후** 별도 UI(배너/모달)로 처리하며, **강제하지 않고 느슨하게 검증**한다(필수 아님, 언제든 재변경 가능)                                                                                                                                                                                                        | 확정                                                                                                                                |
| D4   | 12자리 규칙           | 최대 4/4/4(파티당 4인), 파티 전체가 공석일 수도 있음. 파티 내 구성(버퍼 2명 이상 / 딜러 4명)이 이상하면 valid 경고만 표시, 저장은 막지 않음                                                                                                                                                                                                                                 | 확정                                                                                                                                |
| D5   | 공대표 편집 권한      | 모든 로그인 유저가 임의의 공대표에 자신의 캐릭터를 드래그/제거 가능한 **공동 편집** 구조. 관리자는 기수·탭 카테고리의 생성/삭제만 담당                                                                                                                                                                                                                                      | 확정                                                                                                                                |
| D6   | 직업 목록             | 현재는 직업 마스터 데이터 없이 **역할(딜러/버퍼)까지만** 구분. 직업 필드는 자유 텍스트로 임시 구현하되, 추후 마스터 데이터 셀렉트로 교체 가능하도록 컴포넌트 분리                                                                                                                                                                                                           | 확정                                                                                                                                |
| D7   | 점수 필드             | 0 이상의 정수만 허용, 소수점 불가. 상한은 없으나 통상 수십만 단위가 들어올 것을 UI 폭 설계 시 고려                                                                                                                                                                                                                                                                          | 확정                                                                                                                                |
| D8   | 낙관적 락             | 공대표(기수) row에 `version`(정수) 필드가 있다고 가정하고 저장 시 함께 전송                                                                                                                                                                                                                                                                                                 | 서버 스펙 논의 시 최종 확정 필요 (유지)                                                                                             |
| D9   | 캐릭터 공식 ID        | 캐릭터 스키마에 `officialCharacterId` 필드 추가. 던파 공식 API에서 할당받은 캐릭터 고유 ID를 저장하는 용도이며, **현재 등록 폼에서 유저가 직접 입력하는 필드는 아님** (추후 서버가 API 매칭 후 채워 넣는 방식으로 예상)                                                                                                                                                     | 프론트는 읽기 전용 표시만 대응, 입력 UI는 이번 범위 제외                                                                            |
| D10  | 파티 구성 확장성      | 파티 인원수는 **항상 4명 고정**, 파티 개수/색상(레드·옐로·그린 등)은 **탭(카테고리)별 공통 템플릿**으로 관리하며 관리자가 추가/제거 가능. 딜러/버퍼 구성 규칙은 고정 규칙(딜러 N-1 + 버퍼 1)만 지원하되, 규칙을 한 곳에 모은 훅/모듈로 분리해 추후 규칙 자체를 바꾸기 쉽게 구현                                                                                             | 확정                                                                                                                                |
| D11  | 파티 템플릿 소급 적용 | 카테고리(탭)의 파티 템플릿을 수정해도 **이미 생성된 기수(공대표)에는 소급 적용되지 않음**. 기수 생성 시점의 템플릿을 스냅샷으로 저장                                                                                                                                                                                                                                        | [가정] 데이터 정합성을 위한 기본값. 문제 있으면 알려주세요                                                                          |
| D12  | 활동 로깅             | **상태를 바꾸는 의미 있는 동작만** 로깅(로그인, 캐릭터 CRUD/정렬, 공대표 저장, 카테고리·기수 CRUD). 드래그 중간값·탭 이동 같은 순수 UI 상호작용은 로깅하지 않음. **클라이언트가 직접 로그 이벤트를 만들어 별도 로깅 API(`POST /logs`)로 전송** (서버 자동 로깅 아님, 서버 호출이 없는 동작도 기록 가능하게 하기 위함). 로그 조회 페이지(`/admin/logs`)는 관리자만 접근 가능 | 확정, 12장 참고                                                                                                                     |
| D13  | 캐릭터 등록 방식      | 수동 폼(이름/직업/역할/점수 직접 입력)으로 1건씩 등록하던 방식을 폐지. 넥슨 마이페이지 > 마이캐릭터 화면 전체를 붙여넣으면 (이름, 직업) 쌍을 파싱해 미리보기로 보여주고, 유저가 ✕로 제외한 나머지를 일괄 등록. `role`은 직업명 기반 하드코딩 규칙(크루세이더/인챈트리스/패러메딕/뮤즈 → 버퍼, 나머지 → 딜러)으로 자동 산정, `score`는 0으로 등록 후 유저가 캐릭터 카드 "수정"에서 채움. `CharacterFormModal`은 수정 전용으로 축소 | 확정 (2026-08-25) |
| D14  | 캐릭터 갱신(장비점수 동기화) | 서버가 df.nexon.com 비공식 검색 API를 대신 호출해 최신 장비점수(딜러)/버프력(버퍼)을 가져와 서버 저장값과 비교하는 미리보기 제공. 값이 바뀐 캐릭터만 카운트/저장 대상, 유저가 개별 제외 가능, 최종 반영은 기존 캐릭터 수정 API 재사용 | 확정 (2026-08-25), 백엔드 S9와 대응 |
| D15  | 캐릭터 초상화 이미지 + 공식 데이터 자동 매칭 | 등록 시 서버가 Neople 공식 API로 `officialCharacterId`/`jobId`/장비점수를 자동 매칭·저장(유저 수동 입력 없음). 프론트는 `CharacterAvatar` 컴포넌트 하나로 `serverId`+`officialCharacterId` 기반 초상화(`img-api.neople.co.kr`)를 내 캐릭터 카드/등록·갱신 미리보기/공대표 슬롯에 공통 표시, `jobId`별 `JOB_AVATAR_OFFSET`으로 프레이밍 미세 보정. 동일 이름 재등록은 서버가 upsert로 덮어써 중복 방지 | 확정 (2026-08-26), 백엔드 S10과 대응 |

---

## 1. 기술 스택 가정

- Framework: Next.js (App Router) — 모노레포 내 `packages/web`
- 상태관리: React Query(서버 상태) + Zustand 또는 Context(로컬 편집 상태, 특히 공대표 드래프트)
- 드래그앤드롭: `@dnd-kit/core` (react-beautiful-dnd는 유지보수 종료되어 비권장)
- 스타일: Tailwind CSS
- 폼: `react-hook-form` + `zod` (모험단 이름/캐릭터 등록 valid 규칙 공용)
- 쿠키 기반 세션: `js-cookie` 또는 Next.js `cookies()` API, httpOnly 쿠키 권장 (서버에서 set)

이 챕터는 팀 컨벤션에 맞게 바꿔도 무방하나, 이후 섹션의 컴포넌트 이름은 이 스택 기준으로 작성됨.

---

## 2. 페이지 구조 (라우팅)

```
/                → 로그인 페이지로 리다이렉트 (쿠키 있으면 /dashboard로)
/login           → 로그인 / 모험단 이름 입력 (자동 가입 없음, 2026-08-27)
/signup          → 회원가입 / 모험단 이름 + 서버 입력 (2026-08-27 추가)
/dashboard       → 메인 대시보드 (캐릭터 관리 + 공대표)
/admin/logs      → 활동 로그 조회 (관리자 전용, D12)
```

인증 가드: 미들웨어(`middleware.ts`)에서 세션 쿠키 없으면 `/dashboard`, `/admin/logs` 접근 시 `/login`으로 리다이렉트.
`/admin/logs`는 추가로 `isAdmin === false`인 경우 `/dashboard`로 리다이렉트 (관리자 전용, 12장 참고).

---

## 3. 데이터 모델 (프론트 타입 기준)

```ts
type ServerId =
  | "anton"
  | "bakal"
  | "cain"
  | "casillas"
  | "diregie"
  | "hilder"
  | "prey"
  | "siroco";

type Role = "dealer" | "buffer";

interface Adventure {
  id: string;
  name: string; // 모험단 이름, valid: 1~8자(한글) or 1~16자(영문)
  serverId: ServerId | null; // 로그인 시점엔 null. 대시보드 진입 후 별도 UI로 설정(느슨한 검증), 언제든 변경 가능
  isAdmin: boolean;
}

interface CharacterCard {
  id: string;
  adventureId: string; // 소속 모험단
  name: string;
  job: string; // [D6] 현재는 자유 텍스트, 추후 마스터데이터 셀렉트로 교체 예정
  role: Role; // "dealer" | "buffer"
  score: number; // 딜러: 장비점수, 버퍼: 버프력 (정수, 0 이상)
  order: number; // 좌측 리스트 내 정렬 순서
  officialCharacterId: string | null; // [D9][D15] 던파 공식(Neople) API 캐릭터 ID, 등록 시 서버가 자동 매칭(읽기 전용)
  serverId: ServerId | null; // [D15] 등록 시점 모험단 serverId 스냅샷. 초상화 이미지/공식 API 조회에 사용
  jobId: string | null; // [D15] Neople 직업 대분류 id, jobCategories.ts의 JobId와 대응 (지금은 표시에 안 씀, 이미지 프레이밍 보정용으로 CharacterAvatar에 흘려보냄)
}

// 공대표 상위탭 (2026-08-27 추가). "미카엘라", "디레지에" 등 — 관리자가 언제든 추가 가능
interface RaidGroup {
  id: string;
  label: string;
  order: number;
}

// 공대표 하위탭(카테고리). 같은 group 안에서만 label이 유일하면 됨 — "미카엘라-일반"과
// "디레지에-일반"이 동시에 존재 가능
interface RaidCategory {
  id: string;
  groupId: string; // 소속 RaidGroup
  label: string; // "일반" | "하드" | "쌀" 등, 관리자가 추가/삭제 가능
  order: number;
  partyTemplate: PartyDefinition[]; // [D10] 이 카테고리에서 "새로" 생성되는 기수가 기본으로 갖는 파티 구성
}

// 파티 정의 (색상/라벨). 레드·옐로·그린으로 고정하지 않고 카테고리마다 자유 구성 가능 [D10]
interface PartyDefinition {
  id: string; // 파티 고유 id (슬롯이 이 id를 참조)
  label: string; // "레드" | "옐로" | "그린" | 관리자가 정의한 임의 이름
  colorHex?: string; // UI 표시용 색상 (선택, 없으면 팔레트에서 순번대로 자동 할당)
  order: number; // 보드에 표시되는 순서
}
// 파티 인원수는 시스템 전역 상수로 고정 [D10]
const PARTY_SIZE = 4 as const;

// 공대표 한 기수
interface RaidTeam {
  id: string;
  categoryId: string;
  generationLabel: string; // "일반 1기수" 등, 서버에서 카테고리+순번으로 생성
  version: number; // [D8] 낙관적 락용
  updatedAt: string;
  parties: PartyDefinition[]; // [D11] 생성 시점 categoryTemplate 스냅샷. 이후 카테고리 템플릿이 바뀌어도 이 기수에는 영향 없음
  slots: RaidSlot[]; // 길이 = parties.length * PARTY_SIZE (가변)
}
// 주의: RaidTeam은 서버(ServerId)에 종속되지 않는다 [D3].
// serverId는 Adventure(모험단)에만 존재하며, 캐릭터 드래그 가능 여부와 무관하다.

interface RaidSlot {
  index: number; // 0 ~ (parties.length * PARTY_SIZE - 1)
  partyId: string; // PartyDefinition.id 참조 (더 이상 0/1/2 고정 인덱스 아님)
  slotInParty: number; // 0 ~ (PARTY_SIZE-1), 파티 내 표시 순서
  characterId: string | null;
}

// 좌측 캐릭터 패널 "배치됨" 배지용 (2026-08-27 추가). GET /characters/placements 응답.
// 그룹 내 유일 배치 규칙상 그룹당 최대 1개, 여러 그룹에 걸쳐 있을 수 있음.
interface CharacterPlacement {
  characterId: string;
  groupLabel: string;
  categoryLabel: string;
  generationLabel: string;
}
```

**그룹 내 유일 배치 규칙 (2026-08-27 추가)**: 같은 캐릭터는 같은 `RaidGroup` 안에서는 기수(RaidTeam) 하나에만
배치될 수 있다 — 카테고리가 달라도 마찬가지(미카엘라-일반에 있으면 미카엘라-하드엔 못 들어감). 그룹이
다르면 독립이라 미카엘라와 디레지에에 동시에 배치되는 건 정상. 서버가 저장(`PUT /raid-teams/:id`)
시점에 강제하며, 이미 다른 기수에 있던 캐릭터를 새 슬롯에 놓으면 그쪽은 자동으로 비워진다(이동) —
프론트는 별도 확인 없이 조용히 처리한다(기존 "같은 기수 내 이동" UX와 동일한 톤).

> **확장성 메모**: 파티 개수는 `RaidTeam.parties.length`로 결정되므로 "레드/옐로만" 또는 "레드/옐로/그린/블루" 등
> 카테고리별로 자유롭게 구성 가능하다. 프론트 어디에도 파티 개수를 `3`으로 하드코딩하지 않는다
> (렌더 루프, 유효성 검사, 초기화 로직 모두 `parties` 배열 기준으로 동작해야 함).

---

## 4. 로그인 페이지 (`/login`)

**변경(2026-08-27)**: 로그인은 더 이상 자동 가입을 하지 않는다. 가입되지 않은 이름이면 서버가 404를
반환하고, 프론트는 그 메시지를 그대로 인라인 에러로 보여준 뒤 `/signup`으로 안내하는 회원가입 버튼을 둔다.

### 4.1 UI

- 입력창 1개(모험단 이름) + 로그인 버튼 + 회원가입 버튼(`/signup`으로 이동).
- 클라이언트 유효성 검사(zod):
  - 최소 1자
  - 한글 최대 8자 / 영문 최대 16자 (혼용 시 정책 확정 필요 — 우선 "한글 1자 = 2단위, 영문 1자 = 1단위"로 계산해 16단위 이하로 처리하는 방식을 권장. 예: `한글길이*2 + 영문/기타길이 <= 16`)
- 제출 시 로딩 상태, 실패 시 인라인 에러 메시지.

### 4.2 로직

1. `POST /api/auth/login`에 모험단 이름 전송.
2. 가입된 이름이면 세션 쿠키 set → `/dashboard`. 가입 안 된 이름이면 404 에러를 인라인 표시.
3. 로그인 폼에는 서버(안톤/바칼 등) 선택이 없다 — 서버는 가입 시점(`/signup`)에 이미 정해지며, 이후 재변경은
   대시보드 진입 후 별도로 처리한다 (5.0절 참고).

## 4.5 회원가입 페이지 (`/signup`) — 2026-08-27 추가

### 4.5.1 UI

- 입력창 2개(모험단 이름 + 서버 선택 드롭다운) + 회원가입 버튼 + 로그인으로 돌아가기 버튼.
- 클라이언트 유효성 검사(zod): 모험단 이름은 4.1과 동일, `serverId`는 8종 enum 중 필수 선택.
- 제출 시 로딩 상태, 실패 시 인라인 에러 메시지(이름 중복은 서버가 409로 응답).

### 4.5.2 로직

1. `POST /api/auth/signup`에 `{ adventureName, serverId }` 전송.
2. 성공 시 세션 쿠키 set + `sessionStorage.bbot_onboarding = "new"` → `/dashboard`.
3. 대시보드 진입 시 온보딩 툴팁("캐릭터를 먼저 등록/체크해주세요")은 이 플래그로 트리거된다 (요구사항 3.1 대응).

---

## 5. 대시보드 (`/dashboard`)

레이아웃: 좌측 캐릭터 패널(고정 폭, 내부 스크롤) + 우측 공대표 패널(탭 + 기수 그리드).

### 5.0 서버 선택 온보딩

- `adventure.serverId === null`이면 대시보드 상단에 **닫을 수 있는 배너**("플레이 중인 서버를 선택해주세요") 또는
  헤더의 프로필 영역에 "서버 미설정" 배지를 표시. **모달로 막지 않는다** — 어떤 기능도 서버 선택을 전제하지 않으므로
  느슨하게 안내만 한다.
- 배너/배지 클릭 시 `ServerSelectModal` 오픈: 8개 서버(안톤/바칼/카인/카시야스/디레지에/힐더/프레이/시로코) 중 하나 선택
  → `PATCH /api/me/server` 호출 → 성공 시 배너 사라짐, 실패해도 조용히 토스트만 (기능 차단 없음)
- 이미 서버가 설정된 유저도 프로필 메뉴 등에서 언제든 같은 모달로 재변경 가능 (변경 이력이나 확인 절차 없음 — "타이트하지 않게")
- 이 온보딩 여부는 로컬 상태가 아니라 매번 `adventure.serverId` 값으로 판단 (닫기는 "이번 세션에서만 숨기기"가 아니라
  값이 설정되기 전까지는 새로고침해도 다시 노출되는 것이 기본 — 단, 유저가 배너를 닫으면 그 화면 방문 동안은 다시 안 띄우는 정도의
  가벼운 UX는 허용 [가정])

### 5.1 좌측 — 캐릭터 패널

**컴포넌트**: `CharacterPanel`, `CharacterCard`, `CharacterImportModal`(등록), `CharacterFormModal`(수정 전용), `CharacterRefreshModal`(갱신), `CharacterAvatar`(초상화, 공용)

기능:

- **[D13] 등록 방식 변경 — 수동 폼 입력 폐지, 넥슨 마이캐릭터 페이지 붙여넣기 파싱으로 전환.**
  구 방식(이름/직업/역할/점수를 폼에 직접 입력해 1건씩 등록)은 철회. `CharacterFormModal`은 이제 기존 캐릭터
  **수정 전용**으로만 쓰인다(역할/점수는 등록 후 이 모달에서 채워 넣음).
- 상단 "+ 캐릭터 등록" 버튼 → `CharacterImportModal` 오픈, 2단계 진행:
  1. **붙여넣기**: 유저가 넥슨 마이페이지 > 마이캐릭터 화면 전체를 복사해 텍스트영역에 붙여넣음
     → `lib/parseCharacterImport.ts`의 `parseCharacterImport(raw)`가 파싱. 원문 패턴은 `Lv.115` 줄
     다음에 이름 줄, 그 다음에 직업 줄이 캐릭터 수만큼 반복되는 구조라 이 3줄 묶음만 추출하고 나머지
     텍스트(메뉴/공지 등)는 무시한다. 레벨 값 자체는 저장하지 않는다(요구사항에 없음). 직업명 앞의
     "진(眞) " 접두어는 제거해 "트래블러", "엘레멘탈 마스터" 등 순수 직업명만 남긴다.
  2. **미리보기/확인**: 파싱된 (이름, 직업) 목록을 카드 리스트로 보여주고, 유저가 원치 않는 캐릭터는
     각 항목의 ✕ 버튼으로 제외할 수 있다. 목록이 비면 저장 버튼 비활성화. 이 단계에서 이미
     `POST /api/characters/resolve-official-ids`를 한 번 호출해 각 이름의 초상화 이미지도 미리 보여준다
     (아직 캐릭터가 저장되기 전이라 별도 조회 필요, [D15]).
  - **저장**: 남은 항목마다 `role`을 다음 규칙으로 자동 채워 `POST /api/characters`를 순차 호출
    (서버 `order` 계산 경쟁 방지 위해 병렬 아님):
    - `role`은 직업명에 "크루세이더", "인챈트리스", "패러메딕", "뮤즈"가 포함되면 `BUFFER`, 그 외 전부 `DEALER`
      (`inferRole()` — 하드코딩 목록, 신규 버퍼 직업 추가되면 이 목록만 갱신)
    - `score`는 일단 `0`으로 보내지만 [D15]에 따라 **서버가 등록 시점에 실제 장비점수/버프력으로 덮어씀** —
      프론트는 그냥 낙관적 기본값만 보낸다고 생각하면 됨
    - `officialCharacterId`/`jobId`도 이 요청에서는 안 보내고 서버가 채움 [D9][D15]
    - **저장 진행 중 UI**: 캐릭터당 서버가 외부 API를 여러 번 호출해서(장비점수+공식 캐릭터ID) 느리므로,
      진행률 바 + "저장 중... (N/전체)" 텍스트를 보여주고 "뒤로" 버튼도 비활성화
- **[D14] 캐릭터 갱신 — df.nexon.com에서 최신 장비점수/버프력 동기화.** "+ 캐릭터 등록" 옆 "캐릭터 갱신" 버튼 → `CharacterRefreshModal` 오픈.
  - 오픈 즉시 `GET /characters/refresh-preview` 호출(서버가 df.nexon.com 비공식 API로 대신 조회, [D13/S9]). 로딩 중엔 실제 행과 같은 모양의 스켈레톤(펄스 애니메이션) 5줄 표시.
  - 캐릭터별로 서버 저장값 → 신규값과 증감 배지(초록 +, 빨강 -, 무배지면 변동 없음)를 보여주고, 값이 바뀐 카드는 카드 테두리도 증가=emerald/감소=red로 강조. 못 찾은 캐릭터(이름 변경 등)는 흐리게 표시 + 자동 제외, 나머지는 ✕로 개별 제외 가능(다시 클릭하면 포함으로 토글)
  - **저장 버튼의 "(N명)" 카운트 및 실제 반영 대상에는 변동 없는(신규값=기존값) 캐릭터를 포함하지 않는다** — 어차피 PATCH할 이유가 없으므로
  - 저장 시 남은 항목만 기존 `PATCH /characters/:id`(`score`만)를 순차 호출 — 새 bulk 엔드포인트 없음, `CharacterImportModal`과 같은 패턴
  - 딜러는 장비점수, 버퍼는 버프력이 자동으로 갱신 대상이 됨(서버가 `bufferCharacter` 값 보고 판단, 필드 하나로 통합된 `score`에 반영)
- **[D15] 캐릭터 초상화 이미지 + 공식 데이터 자동 매칭.** 등록 시 서버가 Neople 공식 API로
  `officialCharacterId`/`jobId`/장비점수를 자동으로 채워 넣는다(사용자 수동 입력 없음, 백엔드 S10 대응).
  프론트는 이 값들로 캐릭터 초상화를 그린다:
  - `CharacterAvatar` 컴포넌트(`components/character/CharacterAvatar.tsx`) 하나로 통일 — `serverId`+`officialCharacterId`가
    둘 다 있어야 `https://img-api.neople.co.kr/df/servers/{serverId}/characters/{officialCharacterId}` 이미지를 그리고,
    없으면 회색 placeholder 박스. `size × size` 박스를 `overflow-hidden`으로 감싸고 이미지는 `object-cover`로 꽉 채운 뒤
    (비율 유지 + 확대된 느낌), `jobId`별 `JOB_AVATAR_OFFSET` 보정값(px 단위 x/y, 같은 파일에 정의)만큼 `translate`로 미세 조정
    — 직업마다 원본 이미지 속 인물 위치가 달라서 필요한 jobId만 채워 넣으면 됨, 없는 jobId는 보정 없음
  - 내 캐릭터 카드(`CharacterCard`), 등록 미리보기(`CharacterImportModal`), 갱신 미리보기(`CharacterRefreshModal`),
    공대표 슬롯(`RaidBoard`/`RaidSlotCell`) 전부 같은 컴포넌트로 표시
  - `lib/jobCategories.ts`: Neople 직업 대분류(jobId+jobName) 18종을 `JOB_CATEGORIES` 배열로 정리, `JobId`는 여기서
    리터럴 유니언으로 자동 유도. 서버의 `Job` 참조 테이블과 값이 같아야 함(마이그레이션에 같은 값으로 시딩)
  - **같은 이름의 캐릭터를 다시 등록하면 새로 만들지 않고 서버가 기존 캐릭터를 덮어쓴다** — 프론트는 신경 쓸 것 없음,
    같은 `POST /api/characters` 호출이 서버에서 upsert로 처리됨(중복 등록 방지)
- 카드 리스트:
  - `@dnd-kit`의 `SortableContext`로 세로 정렬, 스크롤 컨테이너 내부
  - 각 카드: 좌측에 `CharacterAvatar` 초상화, 이름/직업/역할 배지/점수, 우측 상단에 삭제(휴지통) 아이콘, 우측에 드래그 핸들
  - 드래그 종료 시 `order` 재계산 후 `PATCH /api/characters/reorder` (배열 전체 순서 전송) — **실시간 반영**(디바운스 300ms 권장, 요구사항 3.6 "실시간으로 서버에 반영")
  - 삭제 클릭 시 확인 다이얼로그 → `DELETE /api/characters/:id` → 성공 시 리스트에서 제거. **단, 해당 캐릭터가 현재 어떤 공대표 슬롯에 배치되어 있다면 그 슬롯도 함께 비워짐**을 안내 문구로 명시 (서버가 cascade 처리한다고 가정, 프론트는 관련 캐시 무효화만 수행)
  - 카드는 공대표 패널로 드래그 가능한 `Draggable` 소스로도 동작 (동일 dnd-kit 컨텍스트를 패널 간 공유하거나, `DndContext`를 상위 대시보드 레벨에 하나로 둠)
  - **배치됨 배지 (2026-08-27 갱신)**: `GET /characters/placements`로 받은 `CharacterPlacement[]`를 캐릭터별로
    필터링해, 소속된 **그룹마다** 태그 하나씩 렌더 — 예: 미카엘라와 디레지에 둘 다 배치돼 있으면
    "배치됨 [미카엘라 일반] [디레지에 하드]". 카드 안에서 이름/역할 배지 줄과 분리된 별도 줄에
    `flex-wrap`으로 배치(그룹이 늘어나도 줄바꿈되게). 그룹 내 유일 배치 규칙 때문에 그룹당 태그는
    최대 1개. [이전 가정 폐기: "카테고리(탭)마다 여러 기수 동시 배치 가능"은 이제 그룹 내에서는 불가 —
    위 "그룹 내 유일 배치 규칙" 참고. 그룹이 다르면 여전히 동시 배치 가능]

### 5.2 우측 — 공대표 패널 (2026-08-27 갱신: 상위탭 도입, 기수는 탭 대신 스크롤)

**계층**: 상위탭(`RaidGroup`, 예: 미카엘라/디레지에) → 하위탭(`RaidCategory`, 예: 일반/하드/쌀) →
그 카테고리에 속한 **모든 기수를 탭 전환 없이 세로로 나열**, 이 목록 영역 하나에서만 스크롤.
이전엔 기수도 pill 탭으로 하나씩 골라 보던 구조였으나, "1기수/2기수를 탭으로 나누지 말고 스크롤로"
요청에 따라 폐지 — RaidGenerationSelector 컴포넌트도 함께 제거됨.

**컴포넌트**: `RaidPanel`(상위탭+하위탭+저장 버튼 오케스트레이션), `RaidGroupFormModal`(상위탭 관리자
CRUD), `RaidCategoryFormModal`(하위탭 관리자 CRUD), `RaidGenerationSection`(기수 하나 = 자기 데이터
조회+로컬 드래프트+저장+삭제+충돌해결을 독립적으로 들고 있는 단위, 목록에 여러 개 동시에 마운트됨),
`RaidBoard`, `RaidParty`, `RaidSlotCell`, `ConflictResolutionModal`

#### 5.2.1 상위탭 (RaidGroup)

- 카테고리 탭 위에 한 단 더 있는 탭바: 미카엘라 / 디레지에 ... (`RaidGroup[]` 기반, `label` 렌더)
- 관리자에게만 "+" (상위탭 추가), 선택된 상위탭에는 "상위탭 수정"/"상위탭 삭제" 버튼 노출
- **상위탭 생성/수정 모달(`RaidGroupFormModal`, 관리자 전용)**: 이름 입력 하나뿐(파티 구성은 하위탭 소관)
- 상위탭 삭제 시 소속된 모든 하위탭·기수가 cascade로 함께 삭제됨을 confirm으로 경고
- 상위탭 전환 시 하위탭 선택은 초기화(첫 번째 하위탭으로)

#### 5.2.2 하위탭 (RaidCategory)

- 선택된 상위탭 소속 카테고리만 탭으로 표시: 일반 / 하드 / 쌀 ... (`GET /raid-categories?groupId=`)
- 관리자에게만 탭 우측에 "+" (카테고리 추가), 선택된 탭에 "탭 수정"/"탭 삭제" 버튼 노출
- **카테고리 생성/수정 모달(`RaidCategoryFormModal`, 관리자 전용)**: 탭 이름 입력 + `partyTemplate` 편집기
  (신규 생성 시 현재 선택된 `groupId`로 소속시킴)
  - 파티(색상) 목록을 추가("+파티 추가")/삭제/드래그로 순서 변경 가능한 리스트로 제공
  - 각 파티 항목: 라벨 텍스트 입력 + 색상 선택(선택사항, 미지정 시 자동 팔레트 할당)
  - 인원수(4명)는 고정값이라 이 화면에 노출하지 않음 (상수 `PARTY_SIZE` 사용)
  - **주의**: 여기서 템플릿을 수정해도 이미 생성된 기수에는 영향 없음 [D11] — 모달 하단에 안내 문구 표시("이 설정은 앞으로 생성되는 기수부터 적용됩니다")
- 같은 `label`이라도 상위탭이 다르면 별개 카테고리(미카엘라-일반 ≠ 디레지에-일반) — 유일성은 `groupId` 안에서만 검사

#### 5.2.3 기수 목록 & 저장 (탭 없이 스크롤)

- 선택된 카테고리의 기수를 `generationLabel`/`generationIndex` 오름차순으로 **전부** 세로로 나열, 목록
  영역 하나만 `overflow-y-auto` — 개별 기수 섹션 자체는 스크롤 안 되고 콘텐츠 높이만큼 자연스럽게 늘어남
- 각 기수 섹션(`RaidGenerationSection`)은 독립적으로: `GET /raid-teams/:id`로 상세 조회, 로컬 드래프트,
  자기 "저장" 버튼(dirty할 때만 활성화), 관리자 전용 "삭제" 버튼, 저장 충돌 시 자기 `ConflictResolutionModal`
- 카테고리 헤더 행에 **"전체 저장" 버튼** — 현재 카테고리 안에서 dirty한 기수만 골라 한 번에 저장 트리거
  (개별 저장 버튼과 완전히 같은 저장 로직을 재사용, 충돌 나면 그 기수 섹션의 모달이 그대로 뜸). 옆에
  "저장하지 않은 기수 N개" 텍스트로 개수 표시
- 관리자에게는 "+ 새 기수" 버튼 → 이름/라벨만 입력받아 즉시 생성 (서버 선택 없음 [D3]). 생성 시 서버가 현재 카테고리의 `partyTemplate`을 스냅샷으로 복사해 `RaidTeam.parties`에 저장한다 [D11]

#### 5.2.4 보드 (RaidBoard)

- 기수의 `parties` 배열을 순회하며 파티 그룹을 렌더 (개수 하드코딩 금지, 카테고리마다 2개일 수도 4개일 수도 있음)
- 각 파티: `PARTY_SIZE`(4)개 슬롯을 세로/가로 카드로 표시. 비어있으면 점선 플레이스홀더, 채워지면 미니 캐릭터 카드(이름/직업/역할/점수)
- 파티 헤더에는 `PartyDefinition.label`과 `colorHex` 기반 색상 배지, 그리고 **평균 장비점수**(2026-08-27
  추가)를 렌더 — 그 파티 슬롯에 배치된 **딜러만** 골라 `score` 평균(반올림)을 헤더 우측에 표시, 딜러가
  하나도 없으면 표시 안 함 [가정: 버퍼 `score`는 "버프력"이라 딜러 장비점수와 단위가 달라 평균에 섞지
  않음]. 레드/옐로/그린을 문자열로 하드코딩하지 않음
- 슬롯은 `Droppable`, 좌측 캐릭터 카드 또는 다른 슬롯의 카드를 드래그해 이동/교체 가능. **다른 기수의
  슬롯으로도 드래그 가능**(2026-08-27) — 같은 화면에 여러 기수가 동시에 떠 있으므로, 드롭 시 원래
  슬롯은 비우고 대상 슬롯에 놓는다(기수 간 이동)
- 슬롯에서 캐릭터 우클릭 또는 X 아이콘으로 슬롯에서 제거(캐릭터 자체는 삭제되지 않음, 배치만 해제)

#### 5.2.5 유효성 배너 (`ValidationBanner`)

아래 두 검증을 클라이언트에서 실시간(드롭 직후) 계산해 배너/뱃지로 표시. **저장을 막지 않는다.**

1. **파티 구성 경고**: 각 파티(`PARTY_SIZE`=4슬롯) 내 구성이 규칙에 어긋나면 해당 파티 헤더에 경고 아이콘 + 툴팁
2. **모험단 중복 경고**: 기수 전체 슬롯(파티 개수와 무관하게 전체)을 스캔해 같은 `adventureId`가 2회 이상 등장하면 상단 배너("○○ 모험단이 중복 배치되어 있습니다")와 해당 캐릭터 카드 테두리를 강조색으로 표시

**파티 구성 규칙은 별도 모듈/훅으로 분리한다** [D10]. 현재는 고정 규칙(딜러 N-1명 + 버퍼 1명)만 지원하지만,
나중에 규칙 자체(예: 파티마다 다른 구성, 버퍼 2명 허용 등)가 바뀌어도 이 모듈만 교체하면 되도록 설계한다.

```ts
// lib/validation/partyComposition.ts
interface PartyValidationIssue {
  type: "TOO_MANY_BUFFERS" | "TOO_MANY_DEALERS" | string; // 향후 규칙 추가 대비 string 허용
  message: string;
}

interface PartyCompositionRule {
  evaluate: (
    members: CharacterCard[],
    partySize: number,
  ) => PartyValidationIssue[];
}

// 기본 규칙: 버퍼는 정확히 1명, 나머지는 딜러(N-1명)여야 한다는 전제 하에
// "버퍼 2명 이상" 또는 "딜러만 PARTY_SIZE명(=버퍼 0명)"일 때만 경고
const defaultPartyCompositionRule: PartyCompositionRule = {
  evaluate: (members, partySize) => {
    const issues: PartyValidationIssue[] = [];
    const bufferCount = members.filter((m) => m.role === "buffer").length;
    const dealerCount = members.filter((m) => m.role === "dealer").length;
    if (bufferCount >= 2) {
      issues.push({
        type: "TOO_MANY_BUFFERS",
        message: "버퍼가 2명 이상입니다.",
      });
    }
    if (dealerCount >= partySize) {
      issues.push({
        type: "TOO_MANY_DEALERS",
        message: `딜러만 ${partySize}명입니다.`,
      });
    }
    return issues;
  },
};

// 훅으로 감싸서 컴포넌트에서 사용 (추후 규칙을 서버 설정이나 카테고리별 config로 바꿔치기하기 쉽도록)
function usePartyCompositionRule(): PartyCompositionRule {
  return defaultPartyCompositionRule; // 지금은 고정, 추후 카테고리별 규칙 주입 지점
}
```

`validateRaidTeam(team, characters, rule): ValidationResult` 형태의 순수 함수로 전체 검증(파티별 규칙 + 모험단 중복)을
조합하고, `rule`은 `usePartyCompositionRule()`에서 주입받는다. 유닛테스트는 규칙을 mock으로 교체해 검증한다.

#### 5.2.6 저장 & 낙관적 락 플로우

기수마다(`RaidGenerationSection`) 독립적으로 아래 플로우를 탄다. "전체 저장"(5.2.3)은 dirty한 기수들에
대해 이 플로우를 각각 트리거하는 것뿐, 별도 배치 API 없음 — 하나가 충돌해도 나머지는 정상 진행된다.

1. "저장" 버튼 클릭 시 로컬 드래프트(`localVersion` 스냅샷 시점의 `version`)와 함께 `PUT /api/raid-teams/:id` 요청, body에 `slots`, `baseVersion`(내가 불러온 시점의 version) 포함
2. 서버 응답:
   - `200 OK` (버전 일치) → 새 `version`으로 캐시 갱신, 성공 토스트
   - `409 Conflict` (버전 불일치, 즉 다른 유저가 먼저 저장함) →
     - **저장 실패**로 처리하되 로컬 드래프트는 보존
     - `ConflictResolutionModal` 오픈: 좌측에 "서버 최신본"(서버가 응답에 함께 내려준 최신 `slots`), 우측에 "내 작업 내용"(로컬 드래프트)을 나란히 표시
     - 유저가 슬롯 단위로 "서버 값 채택" / "내 값 유지"를 선택하거나, 버튼으로 "서버본으로 전체 교체" / "내 작업내용 유지 후 다시 저장 시도" 선택 가능
     - "다시 저장" 클릭 시 `baseVersion`을 최신 값으로 갱신해 1번부터 재시도 (즉 재시도 시에도 그 사이 또 누군가 저장했으면 다시 409 처리)
3. 자동 폴링 또는 소켓 없이, **저장 시점에만** 충돌을 검사하는 것으로 충분 (요구사항에 실시간 동기화 요구 없음). 단, 기수를 열람 중 백그라운드에서 주기적으로 `version`만 가볍게 확인(polling, 예: 30초)해 "최신 변경사항이 있습니다, 새로고침" 배너를 띄우는 것은 선택 구현.
4. **그룹 내 유일 배치 규칙과의 상호작용 (2026-08-27)**: 내가 저장한 캐릭터가 같은 그룹의 다른 기수에도
   있었다면 서버가 그쪽 슬롯을 비우면서 그 기수의 `version`도 올린다. 그 다른 기수를 마침 열어보고 있던
   사용자가 있으면, 그쪽에서 저장을 시도하는 순간 위 2번의 `409 Conflict` 경로로 자연스럽게 감지된다 —
   별도의 실시간 알림 없이 기존 충돌 해결 모달로 흡수.

컴포넌트: `ConflictResolutionModal`이 별도 파일로 존재해야 하며, `RaidSlotDiff` 서브컴포넌트로 슬롯별 차이(동일/추가/제거/변경)를 시각적으로 구분 (색상: 추가=초록, 제거=빨강, 변경=노랑).

---

## 6. 공용 유효성 규칙 (zod 스키마로 통일)

```ts
// 모험단 이름
const adventureNameSchema = z.string().refine((v) => {
  const weightedLength = [...v].reduce(
    (acc, ch) => acc + (/[가-힣]/.test(ch) ? 2 : 1),
    0,
  );
  return v.length >= 1 && weightedLength <= 16;
}, "모험단 이름은 한글 최대 8자 또는 영문 최대 16자입니다."); // [가정: 혼용 규칙]

// 캐릭터 점수 (딜러: 장비점수, 버퍼: 버프력)
const scoreSchema = z.number().int().min(0); // 소수점 불가, 상한 없음(통상 수십만 단위)
```

---

## 7. 활동 로깅 (D12)

### 7.1 로깅 대상 (의미 있는 상태 변경 동작만)

| 액션 코드                                                                | 발생 시점                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `LOGIN`                                                                  | 로그인 성공(신규 가입 포함) 직후                                                |
| `CHARACTER_CREATE`                                                       | 캐릭터 등록 성공 후                                                             |
| `CHARACTER_UPDATE`                                                       | 캐릭터 수정 성공 후                                                             |
| `CHARACTER_DELETE`                                                       | 캐릭터 삭제 성공 후                                                             |
| `CHARACTER_REORDER`                                                      | 순서 변경이 서버에 반영된 후 (디바운스 이후 1회, 드래그 중간값은 로깅하지 않음) |
| `RAID_TEAM_SAVE`                                                         | 공대표 저장 시도 결과(성공/충돌 모두)                                           |
| `RAID_CATEGORY_CREATE` / `RAID_CATEGORY_UPDATE` / `RAID_CATEGORY_DELETE` | 관리자의 탭 CRUD 성공 후                                                        |
| `RAID_TEAM_CREATE` / `RAID_TEAM_DELETE`                                  | 관리자의 기수 CRUD 성공 후                                                      |

드래그 중간값, 탭/기수 선택(단순 열람), 모달 열고 닫기 같은 순수 UI 상호작용은 로깅하지 않는다.

### 7.2 로그 전송 방식

- 클라이언트가 각 액션 완료(성공/실패) 시점에 직접 로그 이벤트를 만들어 `POST /api/logs`로 전송한다 (서버가 API 호출을 가로채 자동 기록하는 방식이 아님).
- 전송은 **fire-and-forget**: 로그 전송 실패가 사용자의 실제 작업 흐름을 막아서는 안 된다 (실패 시 콘솔 경고만, 재시도 큐 등은 이번 범위 제외).
- 공용 유틸 `lib/logging/logAction.ts`로 한 곳에 모아, 각 기능 훅(캐릭터 CRUD, 공대표 저장 등)의 성공/실패 콜백에서 호출한다.

```ts
type LogActionType =
  | "LOGIN"
  | "CHARACTER_CREATE"
  | "CHARACTER_UPDATE"
  | "CHARACTER_DELETE"
  | "CHARACTER_REORDER"
  | "RAID_TEAM_SAVE"
  | "RAID_CATEGORY_CREATE"
  | "RAID_CATEGORY_UPDATE"
  | "RAID_CATEGORY_DELETE"
  | "RAID_TEAM_CREATE"
  | "RAID_TEAM_DELETE";

interface LogActionPayload {
  actionType: LogActionType;
  result: "SUCCESS" | "FAILURE";
  targetType?: "Character" | "RaidTeam" | "RaidCategory" | "Adventure";
  targetId?: string;
  metadata?: Record<string, unknown>; // 예: RAID_TEAM_SAVE 시 { conflict: boolean }, CHARACTER_UPDATE 시 변경 필드 요약
  clientTimestamp: string; // ISO, 이벤트 발생 시각(전송 지연과 구분하기 위함)
}

async function logAction(payload: LogActionPayload): Promise<void> {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 세션 쿠키 포함, 행위자는 서버가 세션에서 식별
      body: JSON.stringify(payload),
    });
  } catch {
    console.warn("[logAction] 로그 전송 실패:", payload.actionType);
  }
}
```

> 행위자(누가 했는지)는 클라이언트가 body에 담지 않는다 — 서버가 요청 쿠키의 세션으로 특정한다 (위조 방지).

### 7.3 로그 조회 페이지 (`/admin/logs`, 관리자 전용)

**접근 제어**: `isAdmin`이 아니면 페이지 진입 즉시 `/dashboard`로 리다이렉트 (레이아웃 레벨 가드) + 좌측 네비게이션 등에도
관리자에게만 "활동 로그" 메뉴 노출.

**컴포넌트**: `AdminLogsPage`, `LogFilterBar`, `LogTable`, `LogDetailDrawer`

- `LogFilterBar`: 행위자(모험단 이름 검색), 액션 타입(멀티셀렉트), 기간(날짜 범위), 결과(성공/실패) 필터
- `LogTable`: 시간(최신순 기본) / 행위자 / 액션 타입 배지 / 대상 / 결과 배지, 서버 페이지네이션(`GET /api/logs?cursor=&limit=`)
- 행 클릭 시 `LogDetailDrawer`에서 `metadata` JSON을 보기 좋게 pretty-print
- 액션 타입별 배지 색상: CREATE=초록, UPDATE=파랑, DELETE=빨강, LOGIN=회색, RAID_TEAM_SAVE=보라(충돌 발생 시 별도 경고 아이콘)

---

## 8. 컴포넌트 트리 요약

```
DashboardPage
├── DndContext (상위 공유)
│   ├── CharacterPanel
│   │   ├── CharacterImportModal (등록, 붙여넣기→미리보기 2단계)
│   │   ├── CharacterFormModal (수정 전용)
│   │   ├── CharacterRefreshModal (갱신, df.nexon.com 동기화 미리보기)
│   │   └── SortableContext
│   │       └── CharacterCard[] (draggable, CharacterAvatar 포함)
│   └── RaidPanel (상위탭+하위탭 오케스트레이션, 2026-08-27 갱신)
│       ├── RaidGroupFormModal (관리자, 상위탭 CRUD, 조건부 렌더)
│       ├── RaidCategoryFormModal (관리자, partyTemplate 편집 포함, 조건부 렌더)
│       └── RaidGenerationSection[] (선택된 카테고리의 기수마다 하나씩, 탭 아님 — 세로 스크롤 목록)
│           ├── ValidationBanner
│           ├── RaidBoard
│           │   └── RaidParty[] (parties.length개, 하드코딩 없음, 평균 장비점수 표시)
│           │       └── RaidSlotCell x4 (PARTY_SIZE, droppable, CharacterAvatar 포함)
│           └── ConflictResolutionModal (조건부 렌더)

AdminLogsPage (관리자 전용, 별도 라우트)
├── LogFilterBar
├── LogTable
└── LogDetailDrawer (조건부 렌더)
```

---

## 9. API 계약 초안 (프론트 기준, 서버팀과 협의 필요)

| Method | Path                        | 설명                                                                 |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| POST   | /api/auth/login             | 모험단 이름 로그인, 세션 쿠키 발급 (가입 안 된 이름이면 404)         |
| POST   | /api/auth/signup            | 모험단 이름+서버로 회원가입, 세션 쿠키 발급 (이름 중복이면 409)      |
| GET    | /api/me                     | 현재 세션의 모험단 정보                                              |
| PATCH  | /api/me/server              | 서버 선택/변경 (느슨한 검증, 언제든 가능)                            |
| GET    | /api/characters             | 내 모험단의 캐릭터 목록 (order순)                                    |
| POST   | /api/characters             | 캐릭터 등록 (동명 있으면 덮어쓰기, officialCharacterId/jobId/score 자동 매칭) |
| POST   | /api/characters/resolve-official-ids | 등록 미리보기용 초상화 이미지 id 조회 (DB 갱신 없음)        |
| GET    | /api/characters/refresh-preview | 캐릭터 갱신 미리보기 (df.nexon.com 최신값 조회, DB 갱신 없음)   |
| PATCH  | /api/characters/reorder     | 순서 배열 일괄 갱신                                                  |
| PATCH  | /api/characters/:id         | 캐릭터 정보 수정                                                     |
| DELETE | /api/characters/:id         | 캐릭터 삭제                                                          |
| GET    | /api/raid-groups            | 상위탭 목록 (2026-08-27 추가)                                        |
| POST   | /api/raid-groups            | 상위탭 생성 (관리자)                                                 |
| PATCH  | /api/raid-groups/:id        | 상위탭 이름 수정 (관리자)                                            |
| DELETE | /api/raid-groups/:id        | 상위탭 삭제 (관리자, 하위탭·기수 cascade)                            |
| GET    | /api/raid-categories?groupId= | 해당 상위탭의 하위탭 목록                                          |
| POST   | /api/raid-categories        | 하위탭 생성 (관리자, `groupId`+`partyTemplate` 포함)                 |
| PATCH  | /api/raid-categories/:id    | 탭 이름/`partyTemplate` 수정 (관리자, 기존 기수엔 소급 미적용 [D11]) |
| DELETE | /api/raid-categories/:id    | 탭 삭제 (관리자)                                                     |
| GET    | /api/raid-teams?categoryId= | 해당 탭의 기수 목록                                                  |
| POST   | /api/raid-teams             | 기수 생성 (관리자)                                                   |
| DELETE | /api/raid-teams/:id         | 기수 삭제 (관리자)                                                   |
| GET    | /api/raid-teams/:id         | 기수 상세(슬롯 포함)                                                 |
| PUT    | /api/raid-teams/:id         | 슬롯 저장, `baseVersion` 필요, 실패 시 409 + 최신본 반환. 그룹 내 다른 기수에 있던 캐릭터는 자동으로 비워짐 |
| GET    | /api/characters/placements  | 내 캐릭터들의 현재 배치(그룹/카테고리/기수 라벨) — 배지 표시용 (2026-08-27 추가) |
| POST   | /api/logs                   | 활동 로그 이벤트 전송 (모든 로그인 유저)                             |
| GET    | /api/logs                   | 활동 로그 조회 (관리자 전용, 필터/페이지네이션)                      |

---

## 10. 이번 단계(프론트 전용) 구현 범위 제외 사항

- 디스코드 봇 연동, 서버(백엔드) 실제 구현은 이 문서 범위 밖. 프론트는 위 API 계약을 목(mock)으로 먼저 구현(MSW 또는 로컬 mock server 권장)하고, 추후 실제 서버 연동 시 엔드포인트만 교체 가능하도록 API 클라이언트를 `packages/web/src/lib/api/*` 등 한 곳에 모아 추상화할 것.
