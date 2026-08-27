// packages/server는 세션 쿠키(로그인 유저) 기준으로만 조회를 허용한다. 봇은 로그인 개념이
// 없으므로, 전용 "서비스 계정"(DISCORD_BOT_ADVENTURE_NAME)으로 /auth/login 해서 세션 쿠키를
// 받아 재사용한다 — 없는 계정이면(404) 그 자리에서 /auth/signup으로 만든다. 백엔드 코드 변경 없이
// 기존 인증 구조를 그대로 재사용하는 쪽을 택함(사용자 확인 사항).
import { env } from "./env";
import { RaidCategory, RaidGroup, RaidTeamDetail, RaidTeamSummary } from "./types";

let sessionCookie: string | null = null;

async function login(): Promise<void> {
  const res = await fetch(`${env.backendUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adventureName: env.botAdventureName }),
  });

  if (res.status === 404) {
    const signupRes = await fetch(`${env.backendUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adventureName: env.botAdventureName,
        serverId: env.botServerId,
      }),
    });
    if (!signupRes.ok) {
      throw new Error(`봇 서비스 계정 생성 실패: ${signupRes.status}`);
    }
    applyCookie(signupRes);
    return;
  }

  if (!res.ok) throw new Error(`봇 로그인 실패: ${res.status}`);
  applyCookie(res);
}

function applyCookie(res: Response): void {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("로그인 응답에 세션 쿠키(Set-Cookie)가 없습니다.");
  sessionCookie = raw.split(";")[0]; // "bbot_sid=..." 부분만
}

async function apiFetch<T>(path: string, retry = true): Promise<T> {
  if (!sessionCookie) await login();

  const res = await fetch(`${env.backendUrl}${path}`, {
    headers: { cookie: sessionCookie! },
  });

  if (res.status === 401 && retry) {
    sessionCookie = null;
    return apiFetch<T>(path, false);
  }
  if (!res.ok) throw new Error(`API 요청 실패 (${path}): ${res.status}`);
  return res.json() as Promise<T>;
}

export const getRaidGroups = () => apiFetch<RaidGroup[]>("/raid-groups");

export const getRaidCategories = (groupId: string) =>
  apiFetch<RaidCategory[]>(
    `/raid-categories?groupId=${encodeURIComponent(groupId)}`,
  );

export const getRaidTeams = (categoryId: string) =>
  apiFetch<RaidTeamSummary[]>(
    `/raid-teams?categoryId=${encodeURIComponent(categoryId)}`,
  );

export const getRaidTeam = (id: string) =>
  apiFetch<RaidTeamDetail>(`/raid-teams/${encodeURIComponent(id)}`);
