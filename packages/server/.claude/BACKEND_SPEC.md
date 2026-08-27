# 던전앤파이터 공대표 서비스 — 서버(백엔드) 구현 지시서

> `b-bot` 모노레포 중 서버(`packages/server` 가정)의 구현 지시서입니다.
> 프론트 문서(`FRONTEND_SPEC.md`)의 결정사항(D1~D11)과 1:1로 대응하도록 작성했으며,
> 여기서는 서버 전용 결정사항을 `S1~`으로 이어서 번호를 매깁니다.
> DB는 `packages/web`, `packages/server`, 디스코드 봇이 **모두 동일한 PostgreSQL 인스턴스**를 바라보되,
> 봇은 서버와 별도로 접근합니다 (S1 참고).

---

## 0. 서버 전용 결정 사항 (Decisions)

| #   | 항목             | 결정 내용                                                                                                                                                                                                                                                                                      | 비고                                                                                                                                              |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | DB 스키마 소유권 | **서버(NestJS + Prisma)가 스키마/마이그레이션의 단일 소스**다. 디스코드 봇은 같은 DB에 별도 클라이언트(예: 자체 Prisma introspect 또는 raw `pg`)로 접근하지만, 마이그레이션은 서버에서만 실행한다                                                                                              | [가정] 두 곳에서 동시에 마이그레이션을 실행하면 충돌 위험이 크므로, 봇 쪽에서 스키마 변경이 필요하면 서버 팀에 먼저 반영 요청하는 프로세스를 권장 |
| S2  | 프레임워크       | NestJS (모듈 구조: `AuthModule`, `AdventureModule`, `CharacterModule`, `RaidCategoryModule`, `RaidTeamModule`)                                                                                                                                                                                 |                                                                                                                                                   |
| S3  | 세션 관리        | DB에 `Session` 테이블을 두는 **stateful 세션**. 세션 id를 httpOnly 쿠키로 발급                                                                                                                                                                                                                 |                                                                                                                                                   |
| S4  | ORM              | Prisma + PostgreSQL. `DATABASE_URL`은 EC2 로컬 인스턴스 기준 아래 값 사용                                                                                                                                                                                                                      | `postgresql://sovran:a62343422@localhost:5432/bbot?schema=public`                                                                                 |
| S5  | 인증 방식        | 비밀번호 없음(D1과 동일). 모험단 이름으로 로그인(가입된 이름만), 회원가입(`/auth/signup`)은 이름+서버로 별도 처리, 세션 발급 시에도 별도 검증 없음                                                                                                                                                                                                       | 보안 조치는 이번 범위에서 의도적으로 제외. 2026-08-27: 로그인 자동 가입 제거                                                                                                         |
| S6  | 관리자 승격      | 서버는 관리자 승격 API를 제공하지 않는다(D2). `isAdmin`은 DB 직접 조작 또는 디스코드 봇 전용 내부 스크립트/명령으로만 변경                                                                                                                                                                     | 서버 코드베이스에는 이 로직 자체가 존재하지 않음                                                                                                  |
| S7  | 동시성 제어      | `RaidTeam.version` 정수 컬럼 기반 낙관적 락. 저장 요청 시 `baseVersion`이 현재 DB의 `version`과 다르면 트랜잭션을 커밋하지 않고 409와 최신 상태를 반환                                                                                                                                         |                                                                                                                                                   |
| S8  | 활동 로깅        | 서버는 API 호출을 자동으로 로깅하지 않는다. **클라이언트가 별도로 `POST /logs`를 호출**해 의미 있는 상태 변경 동작(로그인, 캐릭터 CRUD/정렬, 공대표 저장, 카테고리·기수 CRUD)만 기록. 행위자는 클라이언트가 body로 보내지 않고 **세션에서 서버가 특정**한다. 조회(`GET /logs`)는 관리자만 가능 | 프론트 D12와 대응                                                                                                                                 |
| S9  | 캐릭터 갱신(장비점수 동기화) | 던파 공식 던전앤파이터 공식 API가 아니라 **df.nexon.com 홈페이지가 내부적으로 쓰는 비공식 검색 API**(`GET https://df.nexon.com/world/character/fetch?serverName=&characName=`)를 서버가 대신 호출해 값을 가져온다. 인증/쿠키 불필요, `Referer: https://df.nexon.com/world/character` 헤더만 있으면 200 (curl로 확인). Playwright 등 브라우저 자동화는 불필요해서 안 씀 — Node 내장 `fetch`만 사용. 서버+캐릭터명이 정확히 일치하면 응답 배열 0번째가 그 캐릭터라고 가정(사용자 확인 사항). 응답의 `equipmentPoint`/`buffPoint`는 XOR 난독화되어 있어 `obfuscateKey.key`로 복호화 후 숫자만 추출(`decode-point.ts`, 헤더 스킵 오프셋은 관찰 기반 추정치라 넥슨 쪽 구현 변경 시 깨질 수 있음). `bufferCharacter`가 true면 `buffPoint`, 아니면 `equipmentPoint`를 점수로 채택 | 4.6 참고. 외부 사이트 구조에 의존하는 리버스 엔지니어링이라 깨질 수 있음 — 그때는 실제 응답 샘플 다시 떠서 오프셋/필드명 재확인 |
| S10 | 캐릭터 등록 시 공식 데이터 자동 매칭 | 던파 공식 **Neople Open API**(`GET https://api.neople.co.kr/df/servers/{serverId}/characters?characterName=&apikey=`, API 키는 `NEOPLE_API_KEY` env)를 등록 시점에 호출해 `characterId`(→ `officialCharacterId`, D9)와 `jobId`(→ `jobId`/`Job` 참조)를 자동으로 채운다. 서버+이름이 정확히 일치하면 `rows[0]`이 그 캐릭터라고 가정(사용자 확인 사항). 이미지도 이 API의 서버군 이미지 서버(`https://img-api.neople.co.kr/df/servers/{serverId}/characters/{characterId}`)를 그대로 씀. **같은 모험단에 동명 캐릭터가 이미 있으면 새로 만들지 않고 그 캐릭터를 덮어쓴다**(중복 등록 방지) — 마이캐릭터 붙여넣기를 여러 번 해도 목록이 늘어나지 않음. 등록 시 `score`도 같은 시점에 S9 로직(`NexonScoreService`)으로 자동 조회, 못 찾으면 클라이언트가 보낸 값(현재 0) 유지 | `neople-character.service.ts`, 4.2/4.7 참고. `(adventureId, name)` unique 제약은 안 검(ponytail 주석 참고) — 동시 등록 레이스로 중복 생길 수 있으나 현재 유일한 호출부(등록 모달)가 순차 호출이라 실사용엔 안 걸림 |

---

## 1. 실행 환경

- 배포: AWS EC2 인스턴스에 Node.js 프로세스로 직접 구동 (PM2 또는 systemd 권장, 이번 문서 범위 밖이면 서버팀 컨벤션에 맞춤)
- DB: 같은 EC2(또는 동일 VPC 내) PostgreSQL, 로컬 접속 기준 `localhost:5432`
- 환경변수 (`.env`, `packages/server/.env`):

```env
DATABASE_URL="postgresql://sovran:a62343422@localhost:5432/bbot?schema=public"
PORT=4000
NODE_ENV=production
SESSION_COOKIE_NAME=bbot_sid
SESSION_TTL_DAYS=30
COOKIE_SECURE=true          # HTTPS 리버스 프록시(nginx/ALB) 뒤에 있다는 가정 [가정]
CORS_ORIGIN=https://<프론트 배포 도메인>
```

> **가정**: EC2 앞단에 nginx나 ALB로 TLS 종료가 되어있다고 가정하고 `COOKIE_SECURE=true`, `sameSite=lax`를 기본값으로 잡았습니다.
> 만약 서버가 순수 HTTP로만 서비스된다면 쿠키가 브라우저에서 거부될 수 있으니 실제 배포 구성을 알려주세요.

---

## 2. Prisma 스키마

`packages/server/prisma/schema.prisma` (또는 공유 위치 — S1 참고)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum ServerId {
  anton
  bakal
  cain
  casillas
  diregie
  hilder
  prey
  siroco
}

enum CharacterRole {
  DEALER
  BUFFER
}

model Adventure {
  id          String    @id @default(uuid())
  name        String    @unique
  serverId    ServerId? // 최초 로그인 시점엔 null. 대시보드 진입 후 별도로 설정 (3.2 참고, 느슨한 검증)
  isAdmin     Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  characters  Character[]
  sessions    Session[]
  actionLogs  ActionLog[]

  @@index([serverId])
}

model Character {
  id                  String        @id @default(uuid())
  adventureId         String
  adventure           Adventure     @relation(fields: [adventureId], references: [id], onDelete: Cascade)
  name                String
  job                 String
  role                CharacterRole
  score               Int
  order               Int
  officialCharacterId String?       // 던파 공식(Neople) API 캐릭터 ID. 등록 시 이름으로 검색해 자동 매칭 (D9, S10)
  jobId               String?       // Neople 직업 대분류 id, Job 참조 (등록 시 officialCharacterId와 같이 채움, S10)
  jobCategory         Job?          @relation(fields: [jobId], references: [id])
  serverId            ServerId?     // 등록 시점 모험단 serverId 스냅샷. 공식 API/이미지 조회에 사용 (모험단 serverId가 나중에 바뀌어도 캐릭터별로 고정, D9)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  raidSlots           RaidSlot[]

  @@index([adventureId])
  @@index([adventureId, order])
  @@index([jobId])
}

// Neople 직업 대분류(예: 아처, 귀검사(남)) 참조 테이블. 전 모험단 공용 정적 데이터라
// Character마다 중복 저장하지 않고 jobId로만 참조. 초기 18종은 마이그레이션에서 시딩,
// 미등록 jobId를 새로 만나면(신규 직업 등) 등록 시점에 upsert로 채워 넣는다 (S10)
model Job {
  id   String @id // Neople jobId
  name String

  characters Character[]
}

model Session {
  id          String    @id @default(uuid()) // 쿠키에 담기는 값
  adventureId String
  adventure   Adventure @relation(fields: [adventureId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  @@index([adventureId])
  @@index([expiresAt])
}

model RaidCategory {
  id        String   @id @default(uuid())
  label     String   // "일반", "하드", "쌀" 등
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  partyTemplates CategoryPartyTemplate[]
  raidTeams      RaidTeam[]

  @@unique([label])
}

// 카테고리(탭)에 속한 "파티 템플릿" — 새 기수 생성 시 이 정의를 스냅샷으로 복사한다 (D10, D11)
model CategoryPartyTemplate {
  id         String       @id @default(uuid())
  categoryId String
  category   RaidCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  label      String       // "레드", "옐로", "그린" 등 자유 텍스트
  colorHex   String?
  order      Int

  @@index([categoryId])
  @@unique([categoryId, order])
}

model RaidTeam {
  id              String   @id @default(uuid())
  categoryId      String
  category        RaidCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  generationLabel String   // "일반 1기수" 등, 생성 시 서버가 계산해 저장
  generationIndex Int      // 카테고리 내 정렬/자동 넘버링용 (예: 1, 2, 3 ...)
  version         Int      @default(1) // 낙관적 락 (S7)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  parties         RaidTeamParty[]
  slots           RaidSlot[]

  @@index([categoryId])
  @@unique([categoryId, generationIndex])
}

// RaidTeam 생성 시점의 파티 구성 스냅샷 (카테고리 템플릿이 나중에 바뀌어도 영향받지 않음, D11)
model RaidTeamParty {
  id         String   @id @default(uuid())
  raidTeamId String
  raidTeam   RaidTeam @relation(fields: [raidTeamId], references: [id], onDelete: Cascade)
  label      String
  colorHex   String?
  order      Int

  slots      RaidSlot[]

  @@index([raidTeamId])
  @@unique([raidTeamId, order])
}

model RaidSlot {
  id          String         @id @default(uuid())
  raidTeamId  String
  raidTeam    RaidTeam       @relation(fields: [raidTeamId], references: [id], onDelete: Cascade)
  partyId     String
  party       RaidTeamParty  @relation(fields: [partyId], references: [id], onDelete: Cascade)
  slotInParty Int            // 0 ~ PARTY_SIZE-1 (현재 PARTY_SIZE=4, 상수는 애플리케이션 레벨)
  characterId String?
  character   Character?     @relation(fields: [characterId], references: [id], onDelete: SetNull)

  @@index([raidTeamId])
  @@index([characterId])
  @@unique([partyId, slotInParty])
}

enum LogActionType {
  LOGIN
  CHARACTER_CREATE
  CHARACTER_UPDATE
  CHARACTER_DELETE
  CHARACTER_REORDER
  RAID_TEAM_SAVE
  RAID_CATEGORY_CREATE
  RAID_CATEGORY_UPDATE
  RAID_CATEGORY_DELETE
  RAID_TEAM_CREATE
  RAID_TEAM_DELETE
}

enum LogResult {
  SUCCESS
  FAILURE
}

model ActionLog {
  id               String        @id @default(uuid())
  actorAdventureId String?       // 세션에서 특정, 삭제된 모험단이어도 로그는 남도록 SetNull
  actor            Adventure?    @relation(fields: [actorAdventureId], references: [id], onDelete: SetNull)
  actorNameSnapshot String       // 조회 편의 + 행위자 row가 사라져도 누가 했는지 알 수 있도록 저장 시점 이름 스냅샷
  actionType       LogActionType
  result           LogResult
  targetType       String?       // "Character" | "RaidTeam" | "RaidCategory" | "Adventure" 등 자유 문자열
  targetId         String?
  metadata         Json?         // 부가 정보 (예: 변경 필드 diff, 충돌 여부 등)
  clientTimestamp  DateTime      // 클라이언트가 보낸 실제 행위 발생 시각
  createdAt        DateTime      @default(now()) // 서버 수신 시각

  @@index([actorAdventureId])
  @@index([actionType])
  @@index([createdAt])
}
```

> `Adventure` 모델에 `actionLogs ActionLog[]` 역참조 필드를 추가한다 (위 2장 `Adventure` 모델에 반영 필요).

### 2.1 스키마 설계 노트

- **왜 `RaidSlot`을 미리 다 만들어두는가**: 기수 생성 시 `parties.length * PARTY_SIZE`개의 빈 `RaidSlot` row를 함께 생성해둔다.
  드래그앤드롭으로 배치/해제되는 것은 `RaidSlot.characterId`의 업데이트일 뿐, row 자체의 생성/삭제가 아니다.
  이렇게 하면 "12자리 중 몇 자리가 비어있는지"를 슬롯 존재 여부가 아니라 `characterId IS NULL`로 일관되게 표현할 수 있다.
- **캐릭터 삭제 시**: `Character` 삭제는 `onDelete: SetNull`로 연결된 `RaidSlot.characterId`를 자동으로 `NULL` 처리한다.
  단, 이 경우 해당 `RaidTeam.version`을 증가시켜야 다른 클라이언트가 낙관적 락에서 변경을 감지할 수 있다 →
  **Prisma의 cascade `SetNull`은 자동으로 `version`을 올려주지 않으므로, 캐릭터 삭제 서비스 로직에서 영향받는
  `RaidTeam`들을 찾아 트랜잭션 내에서 명시적으로 `version + 1` 처리해야 한다** (4.3절 참고).
- **모험단 삭제**: 이번 요구사항 범위에 모험단 삭제 기능이 없으므로 구현하지 않는다. (필요 시 `Character`와 마찬가지로
  `onDelete: Cascade`로 캐릭터까지 함께 삭제되는 구조가 이미 반영되어 있음)

---

## 3. 인증 & 세션

### 3.1 로그인 (`POST /auth/login`)

**변경(2026-08-27)**: 로그인은 더 이상 자동 가입을 하지 않는다. 가입은 3.1-1의 별도 엔드포인트로 분리.

**Request Body**

```ts
{
  adventureName: string;
}
```

**검증 (class-validator, D1/프론트 규칙과 동일 기준 서버에서도 재검증)**

- 최소 1자
- 한글 1자=2, 그 외 1자=1로 계산해 합계 16 이하 (프론트 `adventureNameSchema`와 동일 로직을 서버에도 구현 — 프론트 검증은 우회 가능하므로 서버가 최종 방어선)

**처리 로직**

1. `adventureName`으로 `Adventure` 조회
2. 없으면: `404 ADVENTURE_NOT_FOUND` ("가입되지 않은 모험단입니다. 회원가입을 진행해주세요.")
3. 있으면: `Session` row 생성 (`expiresAt = now + SESSION_TTL_DAYS`)
4. `Set-Cookie: bbot_sid=<session.id>; HttpOnly; SameSite=Lax; Secure(prod); Max-Age=...`
5. 응답: `{ adventure: AdventureDto }`

### 3.1-1 회원가입 (`POST /auth/signup`)

**Request Body**

```ts
{
  adventureName: string;
  serverId: ServerId; // 필수 — 로그인과 달리 가입 시점에 받는다
}
```

**검증**: `adventureName`은 3.1과 동일 규칙. `serverId`는 enum(8종) 값이어야 함.

**처리 로직**

1. `adventureName` 중복 확인 → 있으면 `409 ADVENTURE_NAME_TAKEN`
2. 신규 `Adventure` 생성 (`isAdmin: false`, `serverId`는 요청받은 값으로 즉시 설정)
3. `Session` row 생성 + 쿠키 발급 (3.1과 동일)
4. 응답: `{ adventure: AdventureDto }`

### 3.2 서버 선택 (대시보드 진입 후, 느슨한 검증)

**확정(2026-08-27 갱신)**: 로그인 폼은 모험단 이름만 받는다 — 기존 유저는 이미 3.1-1 가입 시점에 `serverId`를
설정했기 때문. `Adventure.serverId`는 여전히 **nullable** 컬럼이며(스키마 변경 없음), 가입 후에도 서버 선택은
대시보드 진입 후 배너/모달로 언제든 재변경 가능하다. "느슨하게 검증"한다는 방침에 따라 다음을 지킨다.

- 서버 선택은 **필수로 강제하지 않는다**: `serverId`가 `null`이어도 캐릭터 등록, 공대표 참여 등 다른 모든 기능은 정상 동작해야 한다
  (D3에서 이미 정했듯 `serverId`는 저장용 태그일 뿐 어떤 기능도 이 값에 의존하지 않으므로 자연스럽게 성립)
- 서버 선택/변경 전용 엔드포인트를 별도로 둔다: `PATCH /me/server`
- 언제든 다시 바꿀 수 있다 (신중한 확인 절차나 변경 이력 관리 없음 — "타이트하지 않게")

**`PATCH /me/server`**

- 권한: 세션만 있으면 됨
- Request: `{ serverId: ServerId }`
- 검증은 enum 값(8종 중 하나)인지만 확인, 그 외 비즈니스 규칙 없음
- 처리: `Adventure.serverId` 업데이트 후 `AdventureDto` 반환
- 로깅(D12/S8) 대상에는 포함하지 않는다 [가정: "상태를 바꾸는 의미 있는 동작" 목록(7.1절)에 없었으므로 제외.
  필요하면 `PROFILE_UPDATE` 같은 액션 타입을 추가하면 됨]

### 3.3 세션 가드

- `SessionGuard` (NestJS `CanActivate`): 쿠키의 `bbot_sid`로 `Session` 조회 → 없거나 만료면 401
- 유효하면 `request.adventure`에 세션에 연결된 `Adventure` 주입 (컨트롤러에서 `@CurrentAdventure()` 커스텀 데코레이터로 접근)
- 만료된 세션은 별도 배치 없이, 조회 시점에 `expiresAt < now`면 그 자리에서 무효 처리(soft) — 대량 정리는 추후 크론으로 (이번 범위 제외)

### 3.4 관리자 가드

- `AdminGuard`: `SessionGuard` 통과 후 `request.adventure.isAdmin === true`가 아니면 403
- 카테고리 생성/수정/삭제, 기수 생성/삭제 엔드포인트에 적용

### 3.5 `GET /me`

- 현재 세션의 `Adventure` 정보 반환 (`{ id, name, serverId: ServerId | null, isAdmin }`)
- 프론트가 새로고침 시 로그인 상태 복원에 사용

### 3.6 로그아웃 (`POST /auth/logout`) — 선택 구현

- 원 요구사항에는 없지만 세션 테이블을 쓰는 이상 최소한의 로그아웃(세션 row 삭제 + 쿠키 만료)은 있는 편이 안전합니다.
  프론트 지시서에는 없었으니 **필요 없다면 생략 가능**, 필요하면 알려주시면 프론트 문서에도 반영하겠습니다.

---

## 4. 캐릭터 API

### 4.1 `GET /characters`

- 현재 세션 모험단 소속 캐릭터를 `order` 오름차순으로 반환
- Response: `CharacterDto[]`

```ts
interface CharacterDto {
  id: string;
  adventureId: string;
  name: string;
  job: string;
  role: 'DEALER' | 'BUFFER';
  score: number;
  order: number;
  officialCharacterId: string | null;
  serverId: ServerId | null;
  jobId: string | null; // Job 참조 테이블 id
}
```

### 4.2 `POST /characters`

**Request**

```ts
{
  name: string;
  job: string;
  role: 'DEALER' | 'BUFFER';
  score: number;
}
```

- `score`: `@IsInt() @Min(0)` (D7) — 클라이언트가 보낸 값은 **폴백**일 뿐, 아래 자동 조회가 성공하면 덮어씀
- `name`: 빈 문자열 불가, 길이 제한은 우선 1~30자 정도로 서버가 방어 [가정 — 명시된 제약 없음]
- `order`는 서버가 계산: 현재 모험단의 캐릭터 중 최대 `order` + 1
- **(S10) 요청 body에는 없지만 서버가 등록 시점에 자동으로 채우는 필드들**, `adventure.serverId`가 설정돼 있을 때만 동작(없으면 전부 `null`/기존 값 유지):
  - `officialCharacterId`, `jobId` — Neople Open API로 이름 검색해 매칭 (D9)
  - `score` — S9(NexonScoreService)로 최신 장비점수/버프력 조회, 못 찾으면 body의 `score` 유지
  - `serverId` — 이 시점 `adventure.serverId`를 캐릭터에 스냅샷으로 저장
- **동일 모험단에 같은 `name`의 캐릭터가 이미 있으면 새로 만들지 않고 그 캐릭터를 update(덮어쓰기)한다** (S10) — 캐릭터 등록(붙여넣기) 흐름을 여러 번 돌려도 목록이 늘어나지 않게. `(adventureId, name)` DB unique 제약은 없음(ponytail — 동시 등록 레이스 가능성 있으나 현재 순차 호출뿐이라 실사용 영향 없음)

### 4.3 `DELETE /characters/:id`

- 소유권 검사: `character.adventureId === session.adventureId`가 아니면 403 (다른 모험단 캐릭터 삭제 금지 — 원문에 명시는 없으나 당연한 보안 경계로 채택 [가정])
- 트랜잭션:
  1. 이 캐릭터가 배치된 모든 `RaidSlot`을 조회해 영향받는 `raidTeamId` 목록 수집
  2. `Character` 삭제 (cascade로 `RaidSlot.characterId`가 `NULL`이 됨)
  3. 수집된 각 `RaidTeam`의 `version`을 `+1` (다른 클라이언트가 저장 시 충돌 감지하도록)
- 응답: `204 No Content`

### 4.4 `PATCH /characters/reorder`

**Request**

```ts
{ orderedIds: string[] } // 새로운 순서대로 나열된 캐릭터 id 배열, 현재 모험단 소유여야 함
```

- 서버는 배열 인덱스를 그대로 `order` 값으로 사용해 일괄 업데이트 (트랜잭션)
- `orderedIds`에 현재 모험단 소유가 아닌 id가 섞여 있으면 전체 요청 400 처리

### 4.5 `PATCH /characters/:id`

- 이름/직업/역할/점수 수정. Body는 4.2와 동일 스키마(부분 업데이트 허용, `PartialType`)
- 소유권 검사 동일하게 적용

### 4.6 `GET /characters/refresh-preview`

- 내 모험단의 캐릭터 전체에 대해 df.nexon.com 비공식 검색 API로 최신 장비점수/버프력을 조회해 서버 저장값과 비교 (S9)
- `adventure.serverId`가 `null`이면 저장을 막지 않고 그냥 400 반환 (서버 미설정 상태에서는 검색 자체가 불가능하므로)
- 캐릭터별 조회는 병렬(`Promise.all`)로 수행 — DB 쓰기가 없어 경쟁 상태 걱정 없음
- 이 엔드포인트는 **DB를 갱신하지 않는다.** 실제 반영은 클라이언트가 미리보기에서 선택한 캐릭터만 골라 기존 `PATCH /characters/:id`를 순차 호출하는 방식 (별도 bulk update 엔드포인트 안 만듦)

Response: `RefreshPreviewItemDto[]`

```ts
interface RefreshPreviewItemDto {
  id: string;
  name: string;
  job: string;
  oldScore: number;
  newScore: number | null; // null이면 공식 홈페이지에서 못 찾음(이름 변경 등)
  officialCharacterId: string | null; // 초상화 이미지용, 캐릭터의 저장된 값 그대로
  serverId: ServerId | null; // 캐릭터별 serverId, 없으면 모험단 serverId로 대체
}
```

- `newScore` 조회에 쓰는 `serverId`도 캐릭터별 `serverId`가 우선이고, 없는(마이그레이션 이전) 캐릭터만 모험단 값으로 대체

### 4.7 `POST /characters/resolve-official-ids`

- **등록 미리보기 전용**: 캐릭터를 붙여넣기로 파싱만 하고 아직 저장하기 전 단계에서, 초상화 이미지를 미리 보여주기 위해 이름만으로 `officialCharacterId`를 조회한다 (DB에 아무것도 안 씀)
- `adventure.serverId`가 없으면 에러 없이 전부 `null`로 응답 (등록 자체를 막지 않기 위해)

**Request**

```ts
{ names: string[] } // 1~50개, class-validator로 크기 제한
```

**Response**: `{ name: string; officialCharacterId: string | null }[]` (요청 배열과 같은 순서)

---

## 5. 공대표 카테고리(탭) API — 관리자 전용

### 5.1 `GET /raid-categories`

- 인증만 필요(모든 로그인 유저 열람 가능), `order` 오름차순

```ts
interface RaidCategoryDto {
  id: string;
  label: string;
  order: number;
  partyTemplate: {
    id: string;
    label: string;
    colorHex: string | null;
    order: number;
  }[];
}
```

### 5.2 `POST /raid-categories` (Admin)

**Request**

```ts
{
  label: string;
  partyTemplate: { label: string; colorHex?: string }[]; // order는 배열 순서대로 서버가 부여
}
```

- `partyTemplate`은 최소 1개 이상 [가정: 파티가 0개인 탭은 의미가 없으므로]
- `label` 중복 시 409 (`@@unique([label])`)
- `order`는 서버가 현재 최대값 + 1로 자동 부여

### 5.3 `PATCH /raid-categories/:id` (Admin)

- `label`, `partyTemplate` 수정 가능
- **`partyTemplate`을 수정해도 기존에 생성된 `RaidTeam`/`RaidTeamParty`/`RaidSlot`은 절대 건드리지 않는다 (D11)**.
  구현상 `CategoryPartyTemplate` row들을 통째로 지우고 요청받은 배열로 다시 생성하는 방식(delete-then-recreate)을 권장 —
  어차피 기존 `RaidTeam`은 `RaidTeamParty`라는 별도 스냅샷 테이블을 참조하므로 영향 없음

### 5.4 `DELETE /raid-categories/:id` (Admin)

- 해당 카테고리의 모든 `RaidTeam`이 cascade로 함께 삭제됨을 관리자에게 프론트에서 명확히 경고할 것 (서버는 그냥 cascade 수행)

---

## 6. 공대표 기수(RaidTeam) API

### 6.1 `GET /raid-teams?categoryId=`

- 해당 카테고리의 기수 목록을 `generationIndex` 오름차순으로 반환 (요약 정보만, 슬롯 상세 제외)

```ts
interface RaidTeamSummaryDto {
  id: string;
  categoryId: string;
  generationLabel: string;
  generationIndex: number;
  version: number;
  updatedAt: string;
}
```

### 6.2 `GET /raid-teams/:id`

- 슬롯 상세 포함 전체 조회

```ts
interface RaidTeamDetailDto extends RaidTeamSummaryDto {
  parties: {
    id: string;
    label: string;
    colorHex: string | null;
    order: number;
  }[];
  slots: {
    id: string;
    partyId: string;
    slotInParty: number;
    character: CharacterDto | null; // 배치된 경우 캐릭터 요약 정보까지 조인해서 내려줌 (프론트가 추가 조회 안 하도록)
  }[];
}
```

### 6.3 `POST /raid-teams` (Admin)

**Request**

```ts
{
  categoryId: string;
}
```

- 처리:
  1. `categoryId`로 `RaidCategory` + `CategoryPartyTemplate[]` 조회
  2. 해당 카테고리의 현재 최대 `generationIndex` + 1 계산 → `generationLabel = "${category.label} ${index}기수"`
  3. 트랜잭션으로:
     - `RaidTeam` 생성 (`version: 1`)
     - `CategoryPartyTemplate`을 그대로 복사해 `RaidTeamParty` 생성 (스냅샷, D11)
     - 생성된 각 `RaidTeamParty`마다 `PARTY_SIZE`(=4)개의 빈 `RaidSlot` 생성 (`characterId: null`)
- 응답: `RaidTeamDetailDto`

### 6.4 `DELETE /raid-teams/:id` (Admin)

- cascade로 `RaidTeamParty`, `RaidSlot` 함께 삭제. `Character`는 삭제되지 않음(연결만 해제)

### 6.5 `PUT /raid-teams/:id` — 슬롯 저장 (낙관적 락 핵심 로직)

**Request**

```ts
{
  baseVersion: number;
  slots: {
    slotId: string;
    characterId: string | null;
  }
  []; // 클라이언트가 편집한 전체 슬롯 상태
}
```

**처리 로직 (하나의 Prisma `$transaction`)**

1. `SELECT version FROM RaidTeam WHERE id = :id FOR UPDATE` (Prisma는 `SELECT ... FOR UPDATE`를 raw query 또는
   트랜잭션 격리 수준 `Serializable`로 대체 가능 — 아래 "구현 메모" 참고)
2. 조회한 `currentVersion !== baseVersion`이면:
   - 트랜잭션 롤백
   - **409 Conflict**, body에 최신 `RaidTeamDetailDto` 포함해 반환 (프론트가 바로 `ConflictResolutionModal`에 사용)
3. `currentVersion === baseVersion`이면:
   - 요청받은 `slots` 배열을 순회하며 각 `RaidSlot.characterId` 업데이트
     - **서버 측 재검증**: 요청에 포함된 `slotId`들이 실제로 이 `raidTeamId`에 속하는지 확인 (아니면 400)
     - `characterId`가 `null`이 아니면, 해당 `Character`가 실제 존재하는지 확인 (없으면 400 — 예: 방금 다른 곳에서 삭제된 캐릭터)
   - `RaidTeam.version`을 `+1`, `updatedAt` 갱신
   - 커밋
4. 응답: `200 OK` + 갱신된 `RaidTeamDetailDto`

**구현 메모 (동시성)**

- PostgreSQL에서 `SELECT ... FOR UPDATE`로 해당 `RaidTeam` row를 잠근 뒤 버전 비교 → 업데이트 → 커밋하는 방식을 권장.
  Prisma로는 `tx.$queryRaw`로 `FOR UPDATE` 조회 후, 같은 트랜잭션 내에서 `tx.raidTeam.update(...)`를 호출하면 된다.
- 대안으로 `UPDATE RaidTeam SET version = version + 1, ... WHERE id = :id AND version = :baseVersion` 형태의
  **조건부 업데이트 한 방**으로 처리하고, `updateMany`의 `count === 0`이면 충돌로 간주하는 방식도 가능 (락 없이 원자적 처리,
  더 단순하고 PostgreSQL의 MVCC로 충분히 안전함). **이 방식을 기본으로 권장.**

```ts
// 의사코드
const result = await tx.raidTeam.updateMany({
  where: { id, version: baseVersion },
  data: { version: { increment: 1 }, updatedAt: new Date() },
});
if (result.count === 0) {
  // 충돌: 최신 상태 조회해서 409로 반환
}
// 성공 시 슬롯들 upsert/update
```

- **유효성 검사(파티 구성 경고, 모험단 중복 경고)는 서버에서 강제하지 않는다.** 요구사항 4.4/4.5/4.6에 따라
  "저장 자체를 막지 않는" 것이 정책이므로, 서버는 구조적으로 불가능한 입력(존재하지 않는 슬롯/캐릭터 등)만 400으로 막고,
  "버퍼 2명 이상" 같은 의미적 경고는 저장을 허용한다. (D4와 일치)

---

## 7. 활동 로그 API (S8)

### 7.1 `POST /logs`

**권한**: 세션만 있으면 됨 (모든 로그인 유저가 자신의 행위를 기록할 수 있어야 함)

**Request**

```ts
{
  actionType: LogActionType;               // 위 enum 중 하나
  result: "SUCCESS" | "FAILURE";
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  clientTimestamp: string;                  // ISO 8601
}
```

**처리 로직**

1. `SessionGuard`로 `request.adventure` 확보 (행위자를 클라이언트 입력이 아니라 세션에서 결정 — 위조 방지)
2. `ActionLog` row 생성: `actorAdventureId = adventure.id`, `actorNameSnapshot = adventure.name`, 나머지는 요청 body 그대로 저장
3. `clientTimestamp`는 신뢰하되 파싱 실패/미래시각 등 명백히 비정상인 값이면 `createdAt`(서버 수신 시각)으로 대체 [가정: 시계 오차에 대한 최소 방어]
4. 응답: `201 Created`, body 없음 (프론트는 fire-and-forget이라 응답 내용을 사용하지 않음)

**설계 노트**

- 이 엔드포인트는 실패해도 사용자의 실제 작업(캐릭터 저장 등)에는 영향이 없어야 하므로, 서버 쪽에서도 무거운 검증 없이
  가볍게 insert만 수행한다. `actionType`이 enum에 없는 값이면 400으로 거부(잘못된 클라이언트 배포 감지용)하되,
  나머지 필드는 관대하게 허용한다.
- Rate limiting은 이번 범위 제외로 하되, 악의적/버그성 대량 전송을 대비해 최소한 body 크기 제한(예: `metadata` 10KB 이하)만
  글로벌 `ValidationPipe`/미들웨어로 걸어둔다 [가정].

### 7.2 `GET /logs` (Admin)

**Query Params**

```ts
{
  cursor?: string;         // 이전 응답의 nextCursor
  limit?: number;          // 기본 50, 최대 200
  actorAdventureId?: string;
  actionType?: LogActionType[];
  result?: "SUCCESS" | "FAILURE";
  from?: string;           // ISO, createdAt 기준
  to?: string;
}
```

**Response**

```ts
interface LogListDto {
  items: {
    id: string;
    actorAdventureId: string | null;
    actorNameSnapshot: string;
    actionType: LogActionType;
    result: 'SUCCESS' | 'FAILURE';
    targetType: string | null;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    clientTimestamp: string;
    createdAt: string;
  }[];
  nextCursor: string | null;
}
```

- 커서 기반 페이지네이션: `createdAt` 내림차순 정렬, `id`를 tie-breaker로 사용 (Prisma `cursor` 옵션 활용)
- `AdminGuard` 적용

---

## 8. 표준 에러 응답 포맷

```ts
interface ErrorResponse {
  statusCode: number;
  errorCode: string; // "ADVENTURE_NOT_FOUND", "RAID_TEAM_VERSION_CONFLICT", "FORBIDDEN_NOT_OWNER" 등
  message: string;
  details?: unknown;
}
```

- NestJS 전역 `HttpExceptionFilter`로 통일. 특히 `RAID_TEAM_VERSION_CONFLICT`(409)의 `details`에는
  `latestRaidTeam: RaidTeamDetailDto`를 항상 포함해 프론트가 별도 조회 없이 바로 충돌 UI를 그릴 수 있게 한다.

---

## 9. 모듈/폴더 구조 제안

```
packages/server/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/login, GET /me
│   │   ├── auth.service.ts
│   │   ├── session.guard.ts
│   │   └── admin.guard.ts
│   ├── characters/
│   │   ├── characters.module.ts
│   │   ├── characters.controller.ts
│   │   ├── characters.service.ts
│   │   ├── nexon-score.service.ts    # df.nexon.com 비공식 API 호출 (S9)
│   │   ├── decode-point.ts           # equipmentPoint/buffPoint XOR 복호화
│   │   ├── neople-character.service.ts # Neople 공식 API characterId/jobId 매칭 (S10)
│   │   └── dto/
│   ├── raid-categories/
│   │   ├── raid-categories.module.ts
│   │   ├── raid-categories.controller.ts
│   │   ├── raid-categories.service.ts
│   │   └── dto/
│   ├── raid-teams/
│   │   ├── raid-teams.module.ts
│   │   ├── raid-teams.controller.ts
│   │   ├── raid-teams.service.ts     # 낙관적 락 트랜잭션 로직 포함
│   │   └── dto/
│   ├── logs/
│   │   ├── logs.module.ts
│   │   ├── logs.controller.ts        # POST /logs, GET /logs
│   │   ├── logs.service.ts
│   │   └── dto/
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts         # PrismaClient를 NestJS DI로 감싼 서비스
├── .env
└── package.json
```

---

## 10. API 엔드포인트 요약

| Method | Path                    | 권한         | 설명                                                               |
| ------ | ----------------------- | ------------ | ------------------------------------------------------------------ |
| POST   | /auth/login             | 없음         | 모험단 이름으로 로그인, 세션 쿠키 발급 (가입 안 된 이름이면 404) |
| POST   | /auth/signup             | 없음         | 모험단 이름+서버로 회원가입, 세션 쿠키 발급 (이름 중복이면 409) |
| POST   | /auth/logout            | 세션         | (선택) 세션 무효화                                                 |
| GET    | /me                     | 세션         | 현재 로그인된 모험단 정보                                          |
| PATCH  | /me/server              | 세션         | 서버 선택/변경 (느슨한 검증, 언제든 변경 가능)                     |
| GET    | /characters             | 세션         | 내 캐릭터 목록                                                     |
| POST   | /characters             | 세션         | 캐릭터 등록 (동명 있으면 덮어쓰기, officialCharacterId/jobId/score 자동 매칭, S10) |
| GET    | /characters/refresh-preview | 세션     | df.nexon.com 비공식 API로 최신 장비점수/버프력 조회 (DB 갱신 없음, S9) |
| POST   | /characters/resolve-official-ids | 세션 | 등록 미리보기용 officialCharacterId 조회 (DB 갱신 없음, S10) |
| PATCH  | /characters/reorder     | 세션         | 정렬 순서 일괄 갱신                                                |
| PATCH  | /characters/:id         | 세션(소유자) | 캐릭터 수정                                                        |
| DELETE | /characters/:id         | 세션(소유자) | 캐릭터 삭제 (관련 슬롯 해제 + 영향받은 RaidTeam version 증가)      |
| GET    | /raid-categories        | 세션         | 탭 목록 (파티 템플릿 포함)                                         |
| POST   | /raid-categories        | 관리자       | 탭 생성                                                            |
| PATCH  | /raid-categories/:id    | 관리자       | 탭/파티템플릿 수정 (기존 기수엔 소급 없음)                         |
| DELETE | /raid-categories/:id    | 관리자       | 탭 삭제 (기수 cascade 삭제)                                        |
| GET    | /raid-teams?categoryId= | 세션         | 기수 목록                                                          |
| POST   | /raid-teams             | 관리자       | 기수 생성 (파티템플릿 스냅샷 + 빈 슬롯 생성)                       |
| DELETE | /raid-teams/:id         | 관리자       | 기수 삭제                                                          |
| GET    | /raid-teams/:id         | 세션         | 기수 상세(파티+슬롯+캐릭터 조인)                                   |
| PUT    | /raid-teams/:id         | 세션         | 슬롯 저장, `baseVersion` 필요, 실패 시 409 + 최신본                |
| POST   | /logs                   | 세션         | 활동 로그 이벤트 기록 (행위자는 세션에서 결정)                     |
| GET    | /logs                   | 관리자       | 활동 로그 조회 (필터/커서 페이지네이션)                            |

---

## 11. 봇(Discord Bot)과의 관계에 대한 메모

- 봇은 이번 문서 범위 밖이지만, 같은 DB를 보는 이상 다음을 서버 팀이 미리 정해두는 것을 권장합니다 (S1 관련, 확인 필요):
  - 봇이 `isAdmin` 컬럼을 직접 `UPDATE`할 때 사용할 인증/권한 체계 (봇 자체의 관리자 명령 권한과는 별개로, DB 접속 계정 권한 문제)
  - `officialCharacterId`/`jobId` 채우기(D9)는 **서버가 캐릭터 등록 시점에 직접 담당**하는 것으로 확정됨(S10) — 봇이 별도로 채울 필요 없음

---

## 12. 이번 단계 구현 범위 제외 사항

- 디스코드 봇 실제 구현
- ~~던파 공식 API 연동~~ → 구현됨: df.nexon.com 비공식 검색 API로 장비점수/버프력 동기화(S9, 4.6), Neople 공식 Open API로 officialCharacterId/jobId 자동 매칭 + 초상화 이미지(S10, 4.2/4.7)
- Rate limiting, 요청 로깅/모니터링, 세션 만료 배치 정리
- HTTPS/리버스 프록시 설정 자체 (인프라 영역, EC2 설정 시 별도 진행)
