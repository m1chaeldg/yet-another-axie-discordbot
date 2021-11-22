import { DiscordAccount, Representative, ScholarAccount } from "../types";
import { google, sheets_v4 } from 'googleapis';
import { Firestore, Timestamp } from "@google-cloud/firestore";

export class DataService {

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    config: {
        gooleSheetClientEmail: string;
        gooleSheetPrivateKey: string;
        gooleSheetSpreadsheetId: string;

        dbEmail: string;
        dbPrivateKey: string;
        dbProjectId: string;
        dbEnableDailySlp: boolean;
    };

    constructor() {
        this.config = {
            gooleSheetClientEmail: process.env.GOOGLE_EMAIL || '',
            gooleSheetPrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').split('\\n').join('\n'),
            gooleSheetSpreadsheetId: process.env.ISKO_SPREADSHEET_ID || '',

            dbEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
            dbPrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').split('\\n').join('\n'),
            dbProjectId: process.env.FIREBASE_PROJECT_ID || '',
            dbEnableDailySlp: process.env.FIREBASE_ENABLE == 'true' || process.env.FIREBASE_ENABLE == '1' || false,
        }
        if (!this.config.gooleSheetClientEmail ||
            !this.config.gooleSheetPrivateKey ||
            !this.config.gooleSheetSpreadsheetId) {
            throw new Error('Missing config');
        }
        if (this.config.dbEnableDailySlp &&
            (!this.config.dbEmail ||
                !this.config.dbPrivateKey ||
                !this.config.dbProjectId)) {
            throw new Error('Missing config');
        }
    }
    ISKO_Accounts = 'Isko!A2:D100'
    ISKO_DiscordAccount = 'DiscordAccount!A2:B100'
    ISKO_Representative = 'Representative!A2:B100'

    sheets: sheets_v4.Sheets | undefined;

    public async initSheet() {
        // configure a JWT auth client
        let jwtClient = new google.auth.JWT(
            this.config.gooleSheetClientEmail,
            undefined,
            this.config.gooleSheetPrivateKey,
            this.SCOPES);
        //authenticate request
        // const creds = await jwtClient.authorize();
        this.sheets = google.sheets({ version: 'v4', auth: jwtClient });
    }

    private async getData(cellRange: string) {
        if (!this.sheets)
            await this.initSheet();

        const range = await this.sheets?.spreadsheets.values.get({
            spreadsheetId: this.config.gooleSheetSpreadsheetId,
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
                    const name = row[0].toLowerCase();
                    const discordId = row[1].toLowerCase();
                    accounts[name] = {
                        name: name,
                        discordId: discordId,
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
                    const representative = (row[0] || '').toLowerCase();
                    const targetName = (row[1] || '').toLowerCase();
                    if (representative && targetName) {
                        if (!accounts[representative])
                            accounts[representative] = [];

                        accounts[representative].push(targetName);
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
                    const name = (row[0] || '').toLowerCase();
                    const address = (row[1] || '').toLowerCase();
                    const privatekey = (row[2] || '').toLowerCase();
                    if (name && address && privatekey)
                        scholars[name] = {
                            name: name,
                            displayName: row[0] || '',
                            address: address,
                            privatekey: privatekey,
                            team: (row[3] || '').toLowerCase()
                        };
                }
            });

        return scholars;
    }

    public async getYesterdaySLP(address: string): Promise<{
        dailySlp: string,
        totalSlp: string,
        lockSlp: string,
        lastClaimedItemAt: number,
        claimableDateISO: string
    } | boolean> {
        if (!this.config.dbEnableDailySlp)
            return false;

        const firestore = new Firestore();
        firestore.settings({
            credentials: {
                client_email: this.config.dbEmail,
                private_key: this.config.dbPrivateKey,
            },
            projectId: this.config.dbProjectId,
        });

        const doc = await firestore.collection('slp')
            .doc(address.replace('0x', 'ronin:'))
            .get();
        if (doc.exists) {
            const data = doc.data();
            return {
                dailySlp: data?.dailySLP,
                totalSlp: data?.totalSlp,
                lockSlp: data?.lockSlp,
                lastClaimedItemAt: data?.lastClaimedItemAt,
                claimableDateISO: (data?.claimableDate as Timestamp).toDate().toISOString(),
            };
        }

        return false;
    }

}