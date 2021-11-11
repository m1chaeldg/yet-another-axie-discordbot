import { DiscordAccount, Representative, ScholarAccount } from "../types";
import { google, sheets_v4 } from 'googleapis';

export class DataService {

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    config: { client_email: string; private_key: string; spreadsheetId: string; };

    constructor() {
        this.config = {
            client_email: process.env.GOOGLE_EMAIL || '',
            private_key: (process.env.GOOGLE_PRIVATE_KEY || '').split('\\n').join('\n'),
            spreadsheetId: process.env.ISKO_SPREADSHEET_ID || '',
        }
        if (!this.config.client_email || !this.config.private_key || !this.config.spreadsheetId) {
            throw new Error('Missing config');
        }
    }
    ISKO_Accounts = 'Isko!A2:C100'
    ISKO_DiscordAccount = 'DiscordAccount!A2:B100'
    ISKO_Representative = 'Representative!A2:B100'

    sheets: sheets_v4.Sheets | undefined;

    public async initSheet() {
        // configure a JWT auth client
        let jwtClient = new google.auth.JWT(
            this.config.client_email,
            undefined,
            this.config.private_key,
            this.SCOPES);
        //authenticate request
        // const creds = await jwtClient.authorize();
        this.sheets = google.sheets({ version: 'v4', auth: jwtClient });
    }

    private async getData(cellRange: string) {
        if (!this.sheets)
            await this.initSheet();

        const range = await this.sheets?.spreadsheets.values.get({
            spreadsheetId: this.config.spreadsheetId,
            range: cellRange,
        });
        return range?.data.values;
    }
    async getDiscordAccounts(): Promise<DiscordAccount> {
        const values = await this.getData(this.ISKO_DiscordAccount);
        const accounts: DiscordAccount = {};

        if (values)
            values.forEach(row => {
                if (row && row.length > 1 && row[0] && row[1]) {
                    accounts[row[0]] = {
                        name: row[0],
                        discordId: row[1],
                    };
                }
            });

        return accounts;
    }
    async getRepresentatives(): Promise<Representative> {
        const values = await this.getData(this.ISKO_Representative);
        const accounts: Representative = {};

        if (values)
            values.forEach(row => {
                if (row && row.length > 1) {
                    const represnative = row[0];
                    const targetName = row[1];
                    if (represnative && targetName) {
                        if (!accounts[represnative])
                            accounts[represnative] = [];

                        accounts[represnative].push(targetName);
                    }
                }

            });

        return accounts;
    }
    public async getScholars(): Promise<ScholarAccount> {
        const values = await this.getData(this.ISKO_Accounts);
        const scholars: ScholarAccount = {};

        if (values)
            values.forEach(row => {
                if (row && row.length > 0) {
                    scholars[row[0]] = {
                        name: row[0],
                        address: row[1],
                        privatekey: row[2]
                    };
                }
            });

        return scholars;
    }
}