import { Client, Message, MessageEmbed } from "discord.js";
import { generateQR, getIskoInfo, getRawMessage, submitSignature } from "./axieApi";
import { DataService } from "./dataService";
import { LazyCache } from "./lazy-cache";
import { Content, DiscordAccount, Representative, ScholarAccount } from "../types";
import { unlink } from 'fs'

export class Command {

    private managers = ['Shim', 'Mike', 'Ryan', 'Kevin', 'Wessa', 'ser0wl'];
    private cache: LazyCache = new LazyCache();


    public discordWhitelistAccounts: DiscordAccount = {};
    public scholars: ScholarAccount = {};
    public representative: Representative = {};

    constructor(private dataService: DataService) {
    }

    public async handleHelp(message: Message, content: Content): Promise<void> {

        const stat = ['!ping',
            '!pong',
            '!alive',
            '!awake',
            '!up'].join('\n');

        const help: { [key: string]: string } = {
            '!qr': 'Generate a QR code of the current requestor or author',
            '!qrOf': 'Generate a QR code of the given discord tag or scholar name',
            '!iskoNames': 'list the current scholar names',
            '!refreshCreds': 'Refresh the credentials',
            '!help': 'Display this message',

            '!ty\n!thanks': 'Thanks the bot',

            '!profile\n!status': 'Get the slp info and mmr of the current requestor or author',
            '!profileOf\n!statusOf': 'Get the slp info and mmr of the given discord tag or scholar name',
        }
        help[stat] = 'Display the current status of the bot';
        const helpString = Object.keys(help).map(k => `${k}\n - ${help[k]}`).join('\n');

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Help')
            .addField('User Command List', helpString)
            .setTimestamp()
            .setFooter('Axie Gaming PH Bot');
        // message.channel.send(embed);
        await message.channel.send({
            embeds: [embed]
        });
    }

    public async handleThanks(message: Message, content: Content): Promise<void> {
        if (content.command === 'thanks' && content.body === '' ||
            content.command === 'thank' && content.body === 'you') {
            await message.channel.send('no problem');
        } else if (content.command === 'thank' && content.body === '') {
            await message.channel.send('you');
        } else if (content.command === 'ty' && content.body === '')
            await message.channel.send('np');
    };

    public async handleQrRequest(message: Message, content: Content): Promise<void> {
        const requestor = this.getIskoNameByDiscordId(message.author.id);
        if (!requestor) {
            await message.reply('no permission to request qr');
            await message.react('❌');
            return;
        }

        const qrOf = this.getQrOf(message, content);
        const targetAccount = this.getIskoNameByDiscordId(qrOf);
        if (targetAccount && this.scholars.hasOwnProperty(targetAccount.name)) {
            const isko = this.scholars[targetAccount.name];

            if (this.managers.includes(requestor.name)) {
                await this.sendQRCode(message, isko);
                return;
            } else if (this.representative.hasOwnProperty(requestor.name) && this.representative[requestor.name].includes(isko.name)) {
                await this.sendQRCode(message, isko);
                return;
            } else if (requestor.name === isko.name) {
                await this.sendQRCode(message, isko);
                return;
            } else {
                await message.reply('no permission to request qr');
            }

        } else {
            await message.reply('Discord ID or Name is not map. Check if properly map with that ID or Name');
        }
        // no isko name found
        await message.react('❌');
    }
    private async sendQRCode(message: Message, isko: { name: string; address: string; privatekey: string; }): Promise<void> {
        if (isko && isko.address && isko.privatekey) {
            console.log(`${new Date().toISOString()} : ${isko.name} requested QR`);

            await message.react('👍');

            const fileNameID = `QRCode_${message.author.id}_${Math.floor(Math.random() * 1000000)}`;

            const authToken = await this.cache.get(isko.name, async () => {
                const rawMsg = await getRawMessage();
                if (rawMsg.status === false) {
                    return null;
                } else {
                    return await submitSignature(isko.address.replace('ronin:', '0x'), isko.privatekey.replace('0x', ''), rawMsg.message);
                }
            });

            if (!authToken) {
                message.reply('Please try again. Axie Infinity API have a problem');
            } else {
                const fName = generateQR(authToken, fileNameID, isko.name);

                await message.author.send(`Here is the new QR Code of ${isko.name}: `);
                message.author.send({
                    files: [fName]
                });

                unlink(fName, d => { });
            }
        } else {
            await message.react('❌');
        }
    }

    private getQrOf(message: Message, content: Content): string {
        // get first the mention user
        if (message.mentions.users.size > 0)
            return message.mentions.users.first()?.id || '';
        // get from message body/content
        if (content.body) {
            const name = content.body.split(' ')[0].toLowerCase();
            const account = Object.values(this.discordWhitelistAccounts).find(v => v.name.toLowerCase() === name || v.discordId === name);
            if (account)
                return account.discordId;
        }
        // if no qr body, use the author
        return message.author.id;
    }

    public async handleRefreshCreds(client: Client, _message: Message | null, _content: Content | null): Promise<void> {

        await this.dataService.initSheet();

        const res = await Promise.all([
            this.dataService.getDiscordAccounts(),
            this.dataService.getScholars(),
            this.dataService.getRepresentatives()
        ])
        this.discordWhitelistAccounts = res[0];
        this.scholars = res[1];
        this.representative = res[2];

        client.user?.setActivity('Axie Infinity', { type: 'PLAYING' });
        if (_message) {
            await _message.reply('Credentials refreshed');
        }

        console.log(`${new Date().toISOString()} : Credentials refreshed`);
    }

    public async handleIskonamesRequest(message: Message, _: Content): Promise<void> {
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Scholars')
            .addField('Names', Object.keys(this.scholars).join('\n'))
            .setTimestamp()
            .setFooter('Axie Gaming PH Bot');

        await message.channel.send({
            embeds: [embed]
        });
    }


    public getIskoNameByDiscordId(discordId: string) {
        return Object.values(this.discordWhitelistAccounts).find(c => c.discordId === discordId);
    }

    public async handleStatusRequest(message: Message, content: Content): Promise<void> {
        const requestor = this.getIskoNameByDiscordId(message.author.id);
        if (!requestor) {
            await message.reply('no permission');
            await message.react('❌');
            return;
        }

        const qrOf = this.getQrOf(message, content);
        const targetAccount = this.getIskoNameByDiscordId(qrOf);
        if (targetAccount && this.scholars.hasOwnProperty(targetAccount.name)) {
            const isko = this.scholars[targetAccount.name];

            await message.react('👍');
            const info = await this.cache.get('profile_' + isko.name, async () => {
                return await getIskoInfo(isko.address);
            });

            if (!info) {
                message.reply('Please try again. Axie Infinity API have a problem');
                return;
            }

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(isko.name)
                .addField('Profile', info.profile)
                .addField('Battle Logs', info.battleLog)
                .addField('MMR', info.mmr.toString())
                .addField('Rank', info.rank.toString())
                .addField('Claimable SLP', info.claimable.toString())
                .addField('Lock SLP', info.unclaimable.toString())
                .addField('Total', info.total.toString())
                .addField('Claimable Date(NJ)', info.claimable_date_NY)
                .addField('Claimable Date(PH)', info.claimable_date_PHT)
                .setTimestamp()
                .setFooter('Axie Gaming PH Bot');

            await message.channel.send({
                embeds: [embed]
            });
        } else {
            await message.reply('Discord ID or Name is not map. Check if properly map with that ID or Name');
        }
    }
}

