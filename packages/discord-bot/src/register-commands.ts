// 슬래시 커맨드를 디스코드에 등록한다. 커맨드 목록(commands/index.ts) 바뀔 때마다 한 번 실행.
// DISCORD_GUILD_ID 있으면 그 서버에만 즉시 반영(개발용, Discord 권장), 없으면 전역 등록(최대 1시간 지연 가능).
// 사용: pnpm --filter @packages/discord-bot run register
import { REST, Routes } from "discord.js";
import { env } from "./env";
import { commands } from "./commands";

async function main() {
  const rest = new REST().setToken(env.discordBotToken);
  const body = commands.map((c) => c.data.toJSON());
  const route = env.discordGuildId
    ? Routes.applicationGuildCommands(env.discordClientId, env.discordGuildId)
    : Routes.applicationCommands(env.discordClientId);
  await rest.put(route, { body });
  console.log(
    `${body.length}개 커맨드 ${env.discordGuildId ? `길드(${env.discordGuildId}) 전용` : "전역"} 등록 완료`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
