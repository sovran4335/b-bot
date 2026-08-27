import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("봇이 살아있는지 확인");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply("pong");
}
