import fs from 'fs';
import path from 'path';
import { Client, Collection, CommandInteraction, Events, GatewayIntentBits, GuildMember } from 'discord.js';
import axios from 'axios';

import { token, devToken, arquivo } from './config.json';

import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import credentials from './credentials.json';
import planilha from './commands/planilha';


const isDevelopmentMode = process.env.TS_NODE_DEV === "development" ? true : false

interface Data {
  limit: number;
  nextKey: null;
  items: [
    {
      Ranking: number;
      RankingChange: number;
      WorldUID: number;
      WorldName: string;
      GuildName: string;
      Class: number;
      CharacterName: string;
      RankingValue: number;
      ProfesionLevel: string;
    }
  ];
  totalCount: number;
  additional: {
    baseDt: Date;
  }
}

export class ClientPlusCommands extends Client {
  commands!: Collection<unknown, unknown>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] }) as ClientPlusCommands;

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath).default;
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  const interval = 1000 * 60 * 5;

  // await updateGooglesheets();
  // await updateDiscordMember();

  // await getTop100();

  // updateBossList(c);
  // setInterval(() => {
  //   updateBossList(c);
  // }, interval)
  
  // market.getPrices()
});

async function getTop100() {
  const url = "https://forumapi.mirmglobal.com/v1/ranking?searchType=1&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000";
  const { data } = await axios.get(url) as { data: Data };

  const topPlayers = data.items.filter(member => !member.GuildName.includes("SNACK") && !member.GuildName.includes("VirtuS") && !member.GuildName.includes("Bankay")).map(member => member.CharacterName).slice(0, 100);

  const doc = new GoogleSpreadsheet(arquivo.id);

  await doc.useServiceAccountAuth({
    client_email: credentials.client_email,
    private_key: credentials.private_key.replace(/\\n/g, '\n')
  })
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Recrutamento"]

  await sheet.loadCells('A1:A')
  topPlayers.forEach(async (player, index) => {
    const cell = sheet.getCellByA1(`A${index + 1}`)
    cell.value = `${player}`
    await cell.save()
  })

}

client.on("interactionCreate", (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === "planilha") {
      planilha.execute(interaction)
    }

    // if (interaction.commandName === "discord") {
    //   discord.execute(interaction)
    // }
  }
})

client.login(isDevelopmentMode ? devToken : token);

export async function updateDiscordMember() {
  const _guild = (await client.guilds.fetch()).map(g => g.name === "VirtuS" && g)[0]
  if (!_guild) return;

  const guild = await _guild.fetch()

  const memberRole = await guild.roles.fetch("1069414959336919138");
  const virtusRole = await guild.roles.fetch("1071923059956662273");
  const virtusxRole = await guild.roles.fetch("1071923119322845245");
  const virtusyRole = await guild.roles.fetch("1071923154483679252");
  const warriorRole = await guild.roles.fetch("1069414959336919136");
  const sorcererRole = await guild.roles.fetch("1069414959336919135");
  const taoistRole = await guild.roles.fetch("1069414959336919134");
  if (!memberRole || !virtusRole || !virtusxRole || !virtusyRole || !warriorRole || !sorcererRole || !taoistRole) return;

  const doc = new GoogleSpreadsheet(arquivo.id);

  await doc.useServiceAccountAuth({
    client_email: credentials.client_email,
    private_key: credentials.private_key.replace(/\\n/g, '\n')
  })
  await doc.loadInfo();

  let guildMembers = (await guild.members.fetch())
    .filter(m => {
      if (!m.user.bot && m.user.id !== guild.ownerId) {
        return m
      }
    })

  const sheet = doc.sheetsByTitle["Membros"]

  const rows = await sheet.getRows()

  const members: GuildMember[] = [];

  for (const row of rows) {
    const discordName = row["Discord"] as string;
    const nickname = row["Nick"] as string;
    const classe = row["Classe"] as string;
    const memberGuild = row["Guild"] as string;

    if (!discordName) continue;
    const [username, discriminator] = discordName.substring(1).split("#");
    console.log(`Atualizando o membro: ${username}`)

    const member = (await guild.members.fetch({ query: username })).first()!
    if (!member) continue;
    if (member.user.username === username && member.user.discriminator === discriminator) {

      try {
        await member.setNickname(nickname)

        await member.roles.add(memberRole);

        if (classe === "Guerreiro") {
          await member.roles.add(warriorRole)
          await member.roles.remove(sorcererRole)
          await member.roles.remove(taoistRole)
        } else if (classe === "Feiticeiro") {
          await member.roles.add(sorcererRole)
          await member.roles.remove(warriorRole)
          await member.roles.remove(taoistRole)
        } else if (classe === "Taoista") {
          await member.roles.add(taoistRole)
          await member.roles.remove(sorcererRole)
          await member.roles.remove(warriorRole)
        }

        if (memberGuild === "VirtuS") {
          await member.roles.add(virtusRole)
          await member.roles.remove(virtusxRole)
          await member.roles.remove(virtusyRole)
        } else if (memberGuild === "VirtuSx") {
          await member.roles.add(virtusxRole)
          await member.roles.remove(virtusRole)
          await member.roles.remove(virtusyRole)
        } else if (memberGuild === "VirtuSy") {
          await member.roles.add(virtusyRole)
          await member.roles.remove(virtusRole)
          await member.roles.remove(virtusxRole)
        }

        members.push(member)
        console.log(`Sucesso`);
      } catch (error) {
        console.log(`Falhou`);
        continue;
      }

    }
  }

  for (const member of members) {
    guildMembers = guildMembers.filter(m => member !== m)
  }

  for (const member of guildMembers) {
    try {
      // await member[1].setNickname("");
      await member[1].roles.remove(memberRole)
      // await member[1].roles.remove(virtusRole)
      // await member[1].roles.remove(virtusxRole)
      // await member[1].roles.remove(virtusyRole)
      // await member[1].roles.remove(warriorRole)
      // await member[1].roles.remove(sorcererRole)
      // await member[1].roles.remove(taoistRole)
    } catch (error) {
      continue;
    }
  }
}
export const updateGooglesheets = async (interaction: CommandInteraction) => {
  const doc = new GoogleSpreadsheet(arquivo.id);

  await doc.useServiceAccountAuth({
    client_email: credentials.client_email,
    private_key: credentials.private_key.replace(/\\n/g, '\n')
  })
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Membros"]

  const rows = await sheet.getRows()

  await getSiteData(interaction, rows)
}

async function getSiteData(interaction: CommandInteraction, rows: GoogleSpreadsheetRow[]): Promise<any> {
  const { data: expData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=5&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=1 EXP
  const { data: cpData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=1&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=5 CP
  const { data: miningData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=10&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=10 Mineração
  const { data: gatheringData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=11&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=11 Coleta
  const { data: fishingData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=12&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=12 Pesca
  const { data: enhancementData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=16&minServerNo=4016&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=16 Aprimoramento
  const { data: enchantmentData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=17&minServerNo=407&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=17 Encantamento
  const { data: blessingData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=18&minServerNo=407&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=18 Bênção
  const { data: smithingData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=13&minServerNo=407&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=13 Forjamento
  const { data: alchemyData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=14&minServerNo=407&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=14 Alquimia
  const { data: refiningData } = await axios.get("https://forumapi.mirmglobal.com/v1/ranking?searchType=15&minServerNo=407&maxServerNo=4016&nextKey=0&limit=1000") as { data: Data } // searchType=15 Refinação

  const baseDt = new Date(expData.additional.baseDt)

  await interaction.followUp("Atualizando...");
  for (const row of rows) {
    console.log(`Getting data for: ${row["Nick"]}`)
    const updateMessage = `[${String(row.rowIndex - 1).padStart(2, "0")}/${rows.length}] Atualizando: ${row["Nick"]}`
    await interaction.editReply(updateMessage);

    const expItem = updateProfesionRow("EXP", expData, row)
    const cpItem = updateProfesionRow("CP", cpData, row)
    const miningItem = updateProfesionRow("Mineração", miningData, row)
    const gatheringItem = updateProfesionRow("Coleta", gatheringData, row)
    const fishingItem = updateProfesionRow("Pesca", fishingData, row)
    const enhancementItem = updateProfesionRow("Aprimoramento", enhancementData, row)
    const enchantmentItem = updateProfesionRow("Encantamento", enchantmentData, row)
    const blessingItem = updateProfesionRow("Bênção", blessingData, row)
    const smithingItem = updateProfesionRow("Forjamento", smithingData, row)
    const alchemyItem = updateProfesionRow("Alquimia", alchemyData, row)
    const refiningItem = updateProfesionRow("Refinação", refiningData, row)

    row["Atualizado Em"] = `${baseDt.getDate()}/${baseDt.getMonth() + 1}/${baseDt.getFullYear()} ${baseDt.getHours()}:${baseDt.getMinutes()}:${baseDt.getSeconds()}`

    if (
      !expItem &&
      !cpItem &&
      !miningItem &&
      !gatheringItem &&
      !fishingItem &&
      !enhancementItem &&
      !enchantmentItem &&
      !blessingItem &&
      !smithingItem &&
      !alchemyItem &&
      !refiningItem
    ) {
      console.log("Failed")
    } else {
      console.log("Success")
      await row.save();
    }
  }

}

function updateProfesionRow(profesion: string, data: any, row: any) {
  const { items } = data as Data
  const player = items.find(m => m.CharacterName === row["Nick"])
  if (player) {
    row["Classe"] = player.Class === 11 ? "Guerreiro" : player.Class === 21 ? "Feiticeiro" : "Taoista";
    row["Guild"] = player.GuildName;
    row[`${profesion}`] = player.ProfesionLevel === "0" ? player.RankingValue : player.ProfesionLevel;
    row[`Ranking ${profesion}`] = String(player.Ranking);
  } else {
    row[`${profesion}`] = "";
    row[`Ranking ${profesion}`] = "";
  }

  return player
}
