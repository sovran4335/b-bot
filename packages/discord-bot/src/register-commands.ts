// 슬래시 커맨드를 디스코드에 전역 등록한다. 커맨드 목록(commands/index.ts) 바뀔 때마다 한 번 실행.
// 사용: pnpm --filter @packages/discord-bot run register
import { REST, Routes } from "discord.js";
import { env } from "./env";
import { commands } from "./commands";

async function main() {
  const rest = new REST().setToken(env.discordBotToken);
  const body = commands.map((c) => c.data.toJSON());
  await rest.put(Routes.applicationCommands(env.discordClientId), { body });
  console.log(`${body.length}개 커맨드 전역 등록 완료`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
