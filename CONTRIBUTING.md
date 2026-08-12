# b-bot 프로젝트 공통 규칙 (CONTRIBUTING)

이 문서는 `b-bot` 모노레포(`packages/web`, `packages/server`, `packages/bot` 등)에서
공통으로 지키는 커밋/브랜치/Git Hook 규칙을 정리합니다. Husky를 처음 써보는 사람도
그대로 따라할 수 있도록 설치 과정부터 적었습니다.

---

## 1. Git Hook이 뭔지 3줄 요약

- Git은 `commit`, `push` 같은 특정 시점에 **로컬에 있는 스크립트 파일을 자동으로 실행**해줍니다. 그게 Git Hook입니다.
- 원래는 `.git/hooks/` 안에 직접 스크립트를 넣어야 하는데, `.git` 폴더는 git으로 관리(커밋)가 안 되기 때문에
  팀원마다 훅이 따로 놀게 됩니다. **Husky**는 이 훅 스크립트를 `.husky/` 폴더(=git으로 커밋 가능한 일반 폴더)에
  두고, `git clone` 후 한 번만 설정하면 모든 팀원에게 동일한 훅이 적용되게 해주는 도구입니다.
- 훅 스크립트가 **0이 아닌 코드로 종료(exit 1 등)**하면 그 시점의 git 작업(커밋/푸시)이 **취소**됩니다.

---

## 2. 처음 설치하는 법 (한 번만 하면 됨)

레포 루트(`b-bot/`)에서:

```bash
# 1) 필요한 패키지 설치 (workspace 루트에 devDependency로)
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional -w

# 2) husky 초기화 — .husky 폴더 생성 + package.json에 "prepare" 스크립트 자동 추가
pnpm exec husky init
```

`husky init`을 실행하면:

- `.husky/pre-commit` 파일이 샘플로 하나 생깁니다 (`npm test` 같은 내용) → 이 문서의 3장 내용으로 덮어씁니다.
- `package.json`에 `"scripts": { "prepare": "husky" }`가 추가됩니다. 이 스크립트는 `pnpm install`을 할 때마다
  자동으로 실행되어 훅을 다시 연결해줍니다 (그래서 팀원이 새로 clone 후 `pnpm install`만 해도 훅이 적용됨).

이후 이 문서의 3장에 있는 파일들을 그대로 `.husky/` 밑에 만들고 실행 권한만 주면 됩니다:

```bash
chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push
```

**설정 파일도 필요합니다** (레포 루트에 생성, 아래 5장 코드 그대로 복사):

- `commitlint.config.js`
- `.lintstagedrc.json`

---

## 3. 적용되는 훅 3가지

### 3.1 `pre-commit` — 커밋 직전

1. **사람 확인 절차**: 비대화형(TTY 없는) 환경이면 즉시 차단. 대화형이면 "yes"를 직접 입력해야 통과.
2. `lint-staged` 실행: **스테이징된 파일만** eslint/prettier로 자동 검사·수정.

### 3.2 `commit-msg` — 커밋 메시지 작성 직후

- `commitlint`로 커밋 메시지가 아래 4장의 컨벤션(Conventional Commits)을 지키는지 검사. 안 지키면 커밋 취소.

### 3.3 `pre-push` — 원격 저장소로 push 직전

1. 마찬가지로 사람 확인 절차(TTY + yes 입력).
2. `lint`, `typecheck`, `test`, `build`를 전체(또는 변경된 패키지만) 실행해 깨진 코드가 원격에 올라가는 것을 방지.

> **팁**: 훅이 실패해서 답답하다고 `git commit --no-verify`로 우회하고 싶어질 수 있는데,
> 이건 훅을 만든 의미 자체가 없어지는 행동입니다. 특히 **AI 에이전트는 이 플래그를 절대 쓰지 않도록**
> `AGENTS.md`에 명시해뒀습니다.

---

## 4. 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <subject>

[선택: 본문]

[선택: 꼬리말, 예: BREAKING CHANGE, Closes #12]
```

**type 목록**

| type       | 의미                                            |
| ---------- | ----------------------------------------------- |
| `feat`     | 새 기능 추가                                    |
| `fix`      | 버그 수정                                       |
| `docs`     | 문서만 변경 (md 파일 등)                        |
| `style`    | 코드 동작에 영향 없는 포맷팅(세미콜론, 공백 등) |
| `refactor` | 기능 변경 없는 코드 구조 개선                   |
| `perf`     | 성능 개선                                       |
| `test`     | 테스트 코드 추가/수정                           |
| `chore`    | 빌드 설정, 패키지 매니저, 기타 잡일             |
| `ci`       | CI/CD 설정 변경                                 |
| `revert`   | 이전 커밋 되돌리기                              |

**scope**: 모노레포 패키지명 권장 — `web`, `server`, `bot`, `db` 등 (생략 가능)

**예시**

```
feat(web): 캐릭터 카드 드래그앤드롭 정렬 구현
fix(server): 공대표 저장 시 버전 충돌 응답 누락 수정
docs: CONTRIBUTING.md 최초 작성
chore(web): husky/commitlint 설정 추가
```

---

## 5. 훅 스크립트 & 설정 파일 원본

아래 파일들을 그대로 레포에 추가하세요 (이 대화의 첨부 파일로도 함께 드립니다: `.husky/pre-commit`,
`.husky/commit-msg`, `.husky/pre-push`, `commitlint.config.js`, `.lintstagedrc.json`).

### `.husky/pre-commit`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# ── 1) 비대화형(non-interactive) 환경 차단 ────────────────────────────────
# AI 에이전트/CI 등 사람이 직접 터미널에 붙어있지 않은 프로세스는
# 대부분 TTY가 없으므로 여기서 막힙니다.
if [ ! -t 1 ]; then
  echo ""
  echo "이 커밋은 비대화형(non-interactive) 환경에서 시도되었습니다."
  echo "AI 에이전트를 포함해 사람의 확인 없는 자동 커밋은 허용되지 않습니다."
  echo "사람이 직접 터미널에서 git commit을 실행해주세요."
  echo ""
  exit 1
fi

# ── 2) 사람 확인 절차 ────────────────────────────────────────────────────
echo ""
echo "커밋될 변경사항(git diff --cached)을 직접 검토하셨습니까?"
printf "계속하려면 'yes' 를 입력하세요: "
read CONFIRM < /dev/tty
if [ "$CONFIRM" != "yes" ]; then
  echo "커밋이 취소되었습니다."
  exit 1
fi

# ── 3) 정적 검사 (스테이징된 파일만) ─────────────────────────────────────
npx lint-staged
```

### `.husky/commit-msg`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

### `.husky/pre-push`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# ── 1) 비대화형 환경 차단 ─────────────────────────────────────────────
if [ ! -t 1 ]; then
  echo ""
  echo "이 push는 비대화형(non-interactive) 환경에서 시도되었습니다."
  echo "AI 에이전트를 포함해 사람의 확인 없는 자동 push는 허용되지 않습니다."
  echo ""
  exit 1
fi

# ── 2) 사람 확인 절차 ──────────────────────────────────────────────────
echo ""
echo "원격 저장소로 push하려고 합니다."
printf "변경사항을 최종 확인하셨으면 'yes' 를 입력하세요: "
read CONFIRM < /dev/tty
if [ "$CONFIRM" != "yes" ]; then
  echo "push가 취소되었습니다."
  exit 1
fi

# ── 3) 전체 검증 (모노레포 전체 또는 변경된 패키지만) ────────────────────
pnpm turbo run lint typecheck test build
```

### `commitlint.config.js`

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
```

### `.lintstagedrc.json`

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

---

## 6. 실제로 한번 써보는 법 (동작 확인)

```bash
# 1) 아무 파일이나 수정
echo "// test" >> packages/web/src/app/page.tsx

# 2) 스테이징
git add .

# 3) 커밋 시도 — pre-commit 훅이 발동
git commit -m "test: 훅 동작 확인"
# → "계속하려면 'yes' 를 입력하세요:" 라는 프롬프트가 뜨면 정상 동작입니다.
#    yes를 입력하면 lint-staged가 돌고, commit-msg 훅이 메시지 형식을 검사합니다.

# 4) 일부러 컨벤션 어긴 메시지로 시도해보기 (실패해야 정상)
git commit -m "그냥 아무렇게나 씀"
# → commitlint가 형식 오류로 커밋을 막아야 합니다.
```

---

## 7. 알아두어야 할 한계 (중요)

- Husky 훅은 **로컬 저장소에만** 적용됩니다. 누군가 `git commit --no-verify`로 우회하거나,
  애초에 `pnpm install`을 안 해서 훅이 연결 안 된 상태로 커밋하면 막을 방법이 없습니다.
- 그래서 로컬 훅은 "1차 방어선"이고, **정말 강제하려면 서버(GitHub) 쪽 설정을 같이 써야 합니다**:
  - GitHub 저장소 Settings → Branches → Branch protection rule에서 `main`(및 필요시 `develop`)에
    - "Require a pull request before merging" (직접 push 금지, PR 필수)
    - "Require status checks to pass" (CI에서 lint/test/build 통과해야 머지 가능)
  - 즉 로컬 pre-push 훅과 별개로, **CI 파이프라인에서도 동일한 lint/typecheck/test/build를 다시 한 번 돌리는 것**을
    권장합니다 (로컬 훅은 우회 가능하지만 CI는 우회가 훨씬 어려움).
  - 이 부분(CI 워크플로우 파일)은 이번 문서 범위 밖이니, 필요하시면 별도로 작성해드릴게요.

AI 에이전트 관련 규칙은 별도로 `AGENTS.md`에 정리했습니다. 이 레포에서 작업하는 모든 AI 에이전트(Claude Code 등)는
`AGENTS.md`를 반드시 읽고 따라야 합니다.
