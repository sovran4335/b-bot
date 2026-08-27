// 루트 .env(심볼릭 링크로 이 패키지에도 연결됨)를 dotenv로 로드한다. packages/server/src/common/env.ts와 동일 패턴.
import "dotenv/config";

export const env = {
  discordBotToken: process.env.DISCORD_BOT_TOKEN ?? "",
  discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY ?? "", // 게이트웨이 봇에는 안 씀, HTTP 인터랙션 엔드포인트로 갈 때 대비해 보관
};

if (!env.discordBotToken) {
  throw new Error("DISCORD_BOT_TOKEN이 설정되지 않았습니다 (루트 .env 확인)");
}
if (!env.discordClientId) {
  throw new Error("DISCORD_CLIENT_ID가 설정되지 않았습니다 (루트 .env 확인)");
}
