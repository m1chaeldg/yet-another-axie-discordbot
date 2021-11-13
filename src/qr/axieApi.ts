import QRCode from "easyqrcodejs-nodejs";
import Web3 from "web3";
import axios from "axios";
const web3 = new Web3();

// ronin or etherscan
const mainnet = 'ronin';

export const fetchData = async (
    postData: { [key: string]: any }
): Promise<any> => {
    const url = 'https://graphql-gateway.axieinfinity.com/graphql';
    const { data, status } = await axios.post(url, postData);

    if (status < 200 && status >= 300) {
        throw Error('Axie Infinity API have a problem');
    }

    return data;
};

export const getRawMessage = async (): Promise<{ status: boolean, message: string }> => {
    try {
        const response = await fetchData({
            'operationName': "CreateRandomMessage",
            'query': "mutation CreateRandomMessage {\n  createRandomMessage\n}\n",
            'variables': {}
        });

        return {
            status: true,
            message: response.data.createRandomMessage
        }
    } catch (err) {
        console.log(err);
        return {
            message: '',
            status: false
        }
    }

};

export const submitSignature = async (accountAddress: string, privateKey: string, randMessage: string) => {
    try {
        let hexSignature = web3.eth.accounts.sign(randMessage, privateKey);
        const signature = hexSignature['signature'];

        const response = await fetchData({
            "operationName": "CreateAccessTokenWithSignature",
            "variables": { "input": { "mainnet": mainnet, "owner": accountAddress, "message": randMessage, "signature": signature } },
            "query": "mutation CreateAccessTokenWithSignature($input: SignatureInput!) {\n  createAccessTokenWithSignature(input: $input) {\n    newAccount\n    result\n    accessToken\n    __typename\n  }\n}\n"
        });

        return response.data.createAccessTokenWithSignature.accessToken;
    } catch (err) {
        console.log(err);
        return false;
    }
};

// A Async function with 2 parameters (accessToken and filenameID) that convert the access token to qr code 
export const generateQR = (accessToken: string, fileNameID: string, iskoName: string): string => {
    // assigning the object (options of qr code) into a variable 
    const qrcode = new QRCode({
        text: accessToken, // the access Token
        width: 256, // width of the qr 
        height: 256, // height of the qr
        colorDark: "#000000", // color of the qr 
        colorLight: "#ffffff", // color of the qr 
        correctLevel: QRCode.CorrectLevel.L,
        quietZone: 15, // size of the quiet zone of qr code
        quietZoneColor: "rgba(0,0,0,0)", // color of the quite zone of qr code
        // logo: './logo.png', // your brand logo path that put in the center of qr
        logoWidth: 40, // logo width size
        logoHeight: 40, // logo height size
        title: `${iskoName}'s Axie Infinity Login QR`,  // title of your QR code
        titleColor: "#004284", // color of the title of qr code
        titleBackgroundColor: "#fff", // background color of the title
        titleHeight: 20, // title height
        titleTop: 10, //draws y coordinates
    });
    const fname = 'qr-' + fileNameID + '.png';

    //save the qr with the object of options as png file with the corresponding scholar id
    qrcode.saveImage({
        path: fname
    });

    return fname;
};

export const getIskoInfo = async (address: string) => {
    try {

        var mmrUrl = 'https://game-api.skymavis.com/game-api/last-season-leaderboard?client_id={address}&offset=0&=limit=0'.replace('{address}', address.replace('ronin:', '0x'));
        let slpUrl = 'https://game-api.skymavis.com/game-api/clients/{address}/items/1'.replace('{address}', address.replace('ronin:', '0x'));

        const res = await Promise.all([
            axios.get(slpUrl),
            axios.get(mmrUrl)]);



        let { data: slpData } = res[0];
        let { data: mmrData } = res[1];
        if (slpData.success && mmrData.success) {

            let total = slpData.total || 0;
            let claimable = slpData.blockchain_related.balance || 0;
            let unix_timestamp = slpData.last_claimed_item_at || 0;

            let date = new Date(unix_timestamp * 1000);
            date.setDate(date.getDate() + 14);

            const convertTZ = (tzString: string) => {
                return date.toLocaleString("en-US", { timeZone: tzString });
            }

            let est = convertTZ('America/New_York');
            let pht = convertTZ('Asia/Manila');

            return {
                total: total,
                claimable: claimable,
                unclaimable: total - claimable,
                claimable_date_NY: est,
                claimable_date_PHT: pht,
                claimable_date: date.toISOString(),
                profile: `https://marketplace.axieinfinity.com/profile/${address.replace('0x', 'ronin:')}/axie`,
                battleLog: `https://axie.zone/profile?ron_addr=${address.replace('ronin:', '0x')}`,
                mmr: mmrData.items[11].elo,
                rank: mmrData.items[11].rank,
                last_claimed_item_at: slpData.last_claimed_item_at || 0
            };
        } else {
            return false;
        }

    } catch (err) {
        console.log(err);
        return false;
    }
};