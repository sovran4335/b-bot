import { Client, GatewayIntentBits, Events, Collection } from "discord.js";
import { env } from "./env";
import { commands } from "./commands";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commandsByName = new Collection(commands.map((c) => [c.data.name, c]));

client.once(Events.ClientReady, (c) => {
  console.log(`로그인됨: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsByName.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`커맨드 실행 실패: ${interaction.commandName}`, err);
    const reply = {
      content: "명령 실행 중 오류가 발생했습니다.",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(env.discordBotToken);
