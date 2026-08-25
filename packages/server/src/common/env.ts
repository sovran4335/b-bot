// 루트 .env(심볼릭 링크로 이 패키지에도 연결됨)를 dotenv로 로드하고, 문서(S.실행 환경)에 없는
// 로컬 개발 기본값만 여기서 보강한다. @nestjs/config 없이 가볍게.
import 'dotenv/config';

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'bbot_sid',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  neopleApiKey: process.env.NEOPLE_API_KEY ?? '', // 없으면 officialCharacterId 매칭만 건너뜀 (필수 아님)
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL이 설정되지 않았습니다 (루트 .env 확인)');
}
