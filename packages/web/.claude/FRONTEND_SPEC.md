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
/login           → 로그인 / 모험단 이름 입력
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
  officialCharacterId: string | null; // [D9] 던파 공식 API 캐릭터 ID, 유저 입력 아님(읽기 전용)
}

// 공대표 카테고리 (탭)
interface RaidCategory {
  id: string;
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
```

> **확장성 메모**: 파티 개수는 `RaidTeam.parties.length`로 결정되므로 "레드/옐로만" 또는 "레드/옐로/그린/블루" 등
> 카테고리별로 자유롭게 구성 가능하다. 프론트 어디에도 파티 개수를 `3`으로 하드코딩하지 않는다
> (렌더 루프, 유효성 검사, 초기화 로직 모두 `parties` 배열 기준으로 동작해야 함).

---

## 4. 로그인 페이지 (`/login`)

### 4.1 UI

- 입력창 1개(모험단 이름) + 로그인 버튼.
- 클라이언트 유효성 검사(zod):
  - 최소 1자
  - 한글 최대 8자 / 영문 최대 16자 (혼용 시 정책 확정 필요 — 우선 "한글 1자 = 2단위, 영문 1자 = 1단위"로 계산해 16단위 이하로 처리하는 방식을 권장. 예: `한글길이*2 + 영문/기타길이 <= 16`)
- 제출 시 로딩 상태, 실패 시 인라인 에러 메시지.

### 4.2 로직

1. `POST /api/auth/login` (또는 서버 액션)에 모험단 이름 전송.
2. 서버 응답:
   - 기존 유저 → 세션 쿠키 set → `/dashboard`
   - 신규 유저 → (서버가 자동 생성 후) 세션 쿠키 set → `/dashboard`
   - 프론트는 신규/기존 여부를 서버 응답의 `isNewUser` 플래그로 받아 토스트만 다르게 표시 (예: "환영합니다, 새 모험단이 생성되었습니다")
3. 최초 로그인(신규 유저)인 경우 대시보드 진입 시 "캐릭터를 먼저 등록/체크해주세요" 안내 툴팁 표시 (요구사항 3.1 "처음 접속 시 왼쪽에 자신의 캐릭터들을 체크할 수 있다"에 대응 — 온보딩 하이라이트로 구현).
4. 로그인 폼에는 서버(안톤/바칼 등) 선택이 없다. 서버 선택은 대시보드 진입 후 별도로 처리한다 (5.0절 참고).

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

**컴포넌트**: `CharacterPanel`, `CharacterCard`, `CharacterFormModal`

기능:

- 상단에 "+ 캐릭터 등록" 버튼 → 모달(`CharacterFormModal`) 오픈
  - 필드: 이름(텍스트), 직업(텍스트 입력, [D6] 현재는 자유 텍스트 — 컴포넌트를 `JobField`로 분리해 추후 마스터 데이터 셀렉트로 무중단 교체 가능하게 구현), 역할(딜러/버퍼 라디오), 점수(숫자, 정수만)
  - 역할에 따라 점수 라벨 전환: 딜러 → "장비점수", 버퍼 → "버프력"
  - `officialCharacterId`는 이 폼에 노출하지 않는다 [D9]. 등록 시 서버가 `null`로 채우고, 추후 API 매칭 기능이 붙으면 캐릭터 카드에 "공식 연동됨" 배지 등으로 표시하는 것을 염두에 두고 타입만 미리 반영한다.
  - 저장 시 `POST /api/characters` → 성공 시 리스트에 낙관적으로 추가, 실패 시 롤백 + 토스트
- 카드 리스트:
  - `@dnd-kit`의 `SortableContext`로 세로 정렬, 스크롤 컨테이너 내부
  - 각 카드: 이름/직업/역할 배지/점수, 우측 상단에 삭제(휴지통) 아이콘, 우측에 드래그 핸들
  - 드래그 종료 시 `order` 재계산 후 `PATCH /api/characters/reorder` (배열 전체 순서 전송) — **실시간 반영**(디바운스 300ms 권장, 요구사항 3.6 "실시간으로 서버에 반영")
  - 삭제 클릭 시 확인 다이얼로그 → `DELETE /api/characters/:id` → 성공 시 리스트에서 제거. **단, 해당 캐릭터가 현재 어떤 공대표 슬롯에 배치되어 있다면 그 슬롯도 함께 비워짐**을 안내 문구로 명시 (서버가 cascade 처리한다고 가정, 프론트는 관련 캐시 무효화만 수행)
  - 카드는 공대표 패널로 드래그 가능한 `Draggable` 소스로도 동작 (동일 dnd-kit 컨텍스트를 패널 간 공유하거나, `DndContext`를 상위 대시보드 레벨에 하나로 둠)
  - 이미 특정 공대표에 배치된 캐릭터는 카드에 작은 배지("배치됨 · 일반 3기수")로 표시 [가정: 캐릭터는 여러 공대표에 동시에 배치 가능한지, 하나의 공대표에만 배치 가능한지 원문에 명시 없음 → **우선 여러 공대표에 동시 배치 가능**하다고 가정. 던파 특성상 같은 기수 내 중복 불가만 룰로 건다(요구사항 4.5는 "모험단 중복 불가"이지 "캐릭터가 여러 기수에 못 감" 규칙이 아님)]

### 5.2 우측 — 공대표 패널

**컴포넌트**: `RaidTabs`, `RaidGenerationSelector`, `RaidBoard`, `RaidParty`, `RaidSlotCell`, `ValidationBanner`

#### 5.2.1 탭 (카테고리)

- 상단 탭바: 일반 / 하드 / 쌀 ... (`RaidCategory[]` 기반, `label` 렌더)
- 관리자에게만 탭 우측에 "+" (카테고리 추가), 각 탭 우클릭 또는 편집모드에서 "삭제" 버튼 노출
- **카테고리 생성/수정 모달(`RaidCategoryFormModal`, 관리자 전용)**: 탭 이름 입력 + `partyTemplate` 편집기
  - 파티(색상) 목록을 추가("+파티 추가")/삭제/드래그로 순서 변경 가능한 리스트로 제공
  - 각 파티 항목: 라벨 텍스트 입력 + 색상 선택(선택사항, 미지정 시 자동 팔레트 할당)
  - 인원수(4명)는 고정값이라 이 화면에 노출하지 않음 (상수 `PARTY_SIZE` 사용)
  - **주의**: 여기서 템플릿을 수정해도 이미 생성된 기수에는 영향 없음 [D11] — 모달 하단에 안내 문구 표시("이 설정은 앞으로 생성되는 기수부터 적용됩니다")
- 탭 클릭 시 해당 카테고리의 기수 목록을 `generationLabel` 오름차순(카테고리별 "라벨 N기수" 접두어 + 순번)으로 정렬해 하위 셀렉터에 표시

#### 5.2.2 기수 선택

- 탭 아래 가로 스크롤 chip 리스트: "일반 1기수", "일반 2기수", ...
- 관리자에게는 "+ 새 기수" 버튼 → 이름/라벨만 입력받아 즉시 생성 (서버 선택 없음 [D3]). 생성 시 서버가 현재 카테고리의 `partyTemplate`을 스냅샷으로 복사해 `RaidTeam.parties`에 저장한다 [D11]
- 관리자에게는 각 기수 chip에 삭제(x) 버튼

#### 5.2.3 보드 (RaidBoard)

- 선택된 기수의 `parties` 배열을 순회하며 파티 그룹을 렌더 (개수 하드코딩 금지, 카테고리마다 2개일 수도 4개일 수도 있음)
- 각 파티: `PARTY_SIZE`(4)개 슬롯을 세로/가로 카드로 표시. 비어있으면 점선 플레이스홀더, 채워지면 미니 캐릭터 카드(이름/직업/역할/점수)
- 파티 헤더에는 `PartyDefinition.label`과 `colorHex` 기반 색상 배지를 렌더 (레드/옐로/그린을 문자열로 하드코딩하지 않음)
- 슬롯은 `Droppable`, 좌측 캐릭터 카드 또는 다른 슬롯의 카드를 드래그해 이동/교체 가능
- 슬롯에서 캐릭터 우클릭 또는 X 아이콘으로 슬롯에서 제거(캐릭터 자체는 삭제되지 않음, 배치만 해제)

#### 5.2.4 유효성 배너 (`ValidationBanner`)

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

#### 5.2.5 저장 & 낙관적 락 플로우

1. "저장" 버튼 클릭 시 로컬 드래프트(`localVersion` 스냅샷 시점의 `version`)와 함께 `PUT /api/raid-teams/:id` 요청, body에 `slots`, `baseVersion`(내가 불러온 시점의 version) 포함
2. 서버 응답:
   - `200 OK` (버전 일치) → 새 `version`으로 캐시 갱신, 성공 토스트
   - `409 Conflict` (버전 불일치, 즉 다른 유저가 먼저 저장함) →
     - **저장 실패**로 처리하되 로컬 드래프트는 보존
     - `ConflictResolutionModal` 오픈: 좌측에 "서버 최신본"(서버가 응답에 함께 내려준 최신 `slots`), 우측에 "내 작업 내용"(로컬 드래프트)을 나란히 표시
     - 유저가 슬롯 단위로 "서버 값 채택" / "내 값 유지"를 선택하거나, 버튼으로 "서버본으로 전체 교체" / "내 작업내용 유지 후 다시 저장 시도" 선택 가능
     - "다시 저장" 클릭 시 `baseVersion`을 최신 값으로 갱신해 1번부터 재시도 (즉 재시도 시에도 그 사이 또 누군가 저장했으면 다시 409 처리)
3. 자동 폴링 또는 소켓 없이, **저장 시점에만** 충돌을 검사하는 것으로 충분 (요구사항에 실시간 동기화 요구 없음). 단, 기수를 열람 중 백그라운드에서 주기적으로 `version`만 가볍게 확인(polling, 예: 30초)해 "최신 변경사항이 있습니다, 새로고침" 배너를 띄우는 것은 선택 구현.

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
│   │   ├── CharacterFormModal
│   │   └── SortableContext
│   │       └── CharacterCard[] (draggable)
│   └── RaidPanel
│       ├── RaidTabs
│       ├── RaidGenerationSelector
│       ├── ValidationBanner
│       ├── RaidBoard
│       │   └── RaidParty[] (parties.length개, 하드코딩 없음)
│       │       └── RaidSlotCell x4 (PARTY_SIZE, droppable)
│       └── ConflictResolutionModal (조건부 렌더)
│       └── RaidCategoryFormModal (관리자, partyTemplate 편집 포함)

AdminLogsPage (관리자 전용, 별도 라우트)
├── LogFilterBar
├── LogTable
└── LogDetailDrawer (조건부 렌더)
```

---

## 9. API 계약 초안 (프론트 기준, 서버팀과 협의 필요)

| Method | Path                        | 설명                                                                 |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| POST   | /api/auth/login             | 모험단 이름 로그인/가입, 세션 쿠키 발급                              |
| GET    | /api/me                     | 현재 세션의 모험단 정보                                              |
| PATCH  | /api/me/server              | 서버 선택/변경 (느슨한 검증, 언제든 가능)                            |
| GET    | /api/characters             | 내 모험단의 캐릭터 목록 (order순)                                    |
| POST   | /api/characters             | 캐릭터 등록                                                          |
| PATCH  | /api/characters/reorder     | 순서 배열 일괄 갱신                                                  |
| PATCH  | /api/characters/:id         | 캐릭터 정보 수정                                                     |
| DELETE | /api/characters/:id         | 캐릭터 삭제                                                          |
| GET    | /api/raid-categories        | 탭 목록                                                              |
| POST   | /api/raid-categories        | 탭 생성 (관리자, `partyTemplate` 포함)                               |
| PATCH  | /api/raid-categories/:id    | 탭 이름/`partyTemplate` 수정 (관리자, 기존 기수엔 소급 미적용 [D11]) |
| DELETE | /api/raid-categories/:id    | 탭 삭제 (관리자)                                                     |
| GET    | /api/raid-teams?categoryId= | 해당 탭의 기수 목록                                                  |
| POST   | /api/raid-teams             | 기수 생성 (관리자)                                                   |
| DELETE | /api/raid-teams/:id         | 기수 삭제 (관리자)                                                   |
| GET    | /api/raid-teams/:id         | 기수 상세(슬롯 포함)                                                 |
| PUT    | /api/raid-teams/:id         | 슬롯 저장, `baseVersion` 필요, 실패 시 409 + 최신본 반환             |
| POST   | /api/logs                   | 활동 로그 이벤트 전송 (모든 로그인 유저)                             |
| GET    | /api/logs                   | 활동 로그 조회 (관리자 전용, 필터/페이지네이션)                      |

---

## 10. 이번 단계(프론트 전용) 구현 범위 제외 사항

- 디스코드 봇 연동, 서버(백엔드) 실제 구현은 이 문서 범위 밖. 프론트는 위 API 계약을 목(mock)으로 먼저 구현(MSW 또는 로컬 mock server 권장)하고, 추후 실제 서버 연동 시 엔드포인트만 교체 가능하도록 API 클라이언트를 `packages/web/src/lib/api/*` 등 한 곳에 모아 추상화할 것.
