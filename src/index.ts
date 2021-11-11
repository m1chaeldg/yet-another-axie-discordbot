import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import discord, { Intents, User } from 'discord.js';
import { FeatureFile } from './types';

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No bot token found!');
}

const client = new discord.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const features: FeatureFile[] = [];
const featureFiles = fs
  .readdirSync(path.resolve(__dirname, './features'))
  // Look for files as TS (dev) or JS (built files)
  .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const featureFile of featureFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const feature = require(`./features/${featureFile}`) as FeatureFile;
  features.push(feature);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  features.forEach((f) => f.onStartup?.(client));
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  features.forEach((f) => f.onMessage?.(client, message));
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
