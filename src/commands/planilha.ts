import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { updateGooglesheets } from "../index";

export default {
  data: new SlashCommandBuilder()
    .setName('planilha')
    .setDescription('Atualiza as informações da planilha'),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    await updateGooglesheets(interaction);
    await interaction.editReply('Planilha atualizada!');
  },
};
