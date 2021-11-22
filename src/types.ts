import { Client, Message, MessageReaction, User } from 'discord.js';

/* --------------------
 * Feature handlers
 */

export type OnStartupHandler = (client: Client) => Promise<void>;

export type OnMessageHandler = (
  client: Client,
  message: Message
) => Promise<void>;

export type OnReactionAddHandler = (
  client: Client,
  reaction: MessageReaction,
  user: User
) => Promise<void>;

/* -------------------------------------------------- */

export type FeatureFile = {
  onStartup?: OnStartupHandler;
  onMessage?: OnMessageHandler;
  onReactionAdd?: OnReactionAddHandler;
};


export type Content = {
  command: string;
  body: string;
};

// keypair for discord id and name/username
export type DiscordAccount = {
  [discordId: string]: {
    name: string;
    discordId: string;
  };
}

export type ScholarAccount = {
  [name: string]: ScholarAccountItem;
}
export type ScholarAccountItem = {
  name: string;
  address: string;
  privatekey: string;
  displayName: string;
  team: string;
}


export type Representative = {
  [name: string]: string[];
}


export type CacheItem = {
  value: any;
  expiry: number;
}