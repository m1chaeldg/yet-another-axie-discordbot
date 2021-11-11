import { Client, Message } from 'discord.js';
import { DataService } from '../qr/dataService';
import { Content, OnMessageHandler, OnStartupHandler } from '../types';
import { Command } from '../qr/Command';

const prefix = '!';

const handler = new Command(new DataService());

export const onStartup: OnStartupHandler = async (client: Client): Promise<void> => {
    await handler.handleRefreshCreds(client, null, null);
}
export const onMessage: OnMessageHandler = async (client, message: Message) => {

    if (!message.content.startsWith(prefix) || message.author.bot || message.author.id === client.user?.id)
        return;

    //if author is not part of the discord white list
    if (!handler.getIskoNameByDiscordId(message.author.id.toString()))
        return;

    const args = message.content.slice(prefix.length).trim().split(' ') || [];
    const command = args.shift()?.toLowerCase() || '';
    const content: Content = {
        command: command,
        body: args.join(' ')
    };

    if (!command)
        return; // no command provided

    switch (command) {
        case 'help':
            await handler.handleHelp(message, content);
            break;
        case 'pong':
        case 'ping':
            await message.channel.send('online');
            break;
        case 'up':
        case 'alive':
        case 'awake':
            await message.react('🙂');
            break;
        case 'qr':
        case 'qrof':
            await handler.handleQrRequest(message, content);
            break;
        case 'iskonames':
            await handler.handleIskonamesRequest(message, content);
            break;
        case 'refreshcreds':
            await handler.handleRefreshCreds(client, message, content);
            break;
        case 'thanks':
        case 'thank':
        case 'ty':
            await handler.handleThanks(message, content);
            break;
        case 'profile':
        case 'profileof':
        case 'status':
        case 'statusof':
            await handler.handleStatusRequest(message, content);
            break;
    }
};

