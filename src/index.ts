import * as functions from 'firebase-functions';

import { FaucetApi, expressApp, discordFaucetApp } from './clients';
import { DISCORD_APP_CLIENT_ID, DISCORD_APP_TOKEN, appConfig } from './config';

import '@polkadot/api-augment';

const faucetAccountSeed = process.env.FAUCET_SECRET_PHRASE || functions.config().faucet.secret_phrase;
if (!faucetAccountSeed) {
    throw Error('Secret phrase is not defined');
}

const astarApi = new FaucetApi({
    mnemonic: faucetAccountSeed,
    endpoint: appConfig.network['astar'].endpoint,
    requestTimeout: appConfig.network['astar'].requestTimeout,
    faucetDripAmount: appConfig.network['astar'].amount,
});

const shidenApi = new FaucetApi({
    mnemonic: faucetAccountSeed,
    endpoint: appConfig.network['shiden'].endpoint,
    requestTimeout: appConfig.network['shiden'].requestTimeout,
    faucetDripAmount: appConfig.network['shiden'].amount,
});

const shibuyaApi = new FaucetApi({
    mnemonic: faucetAccountSeed,
    endpoint: appConfig.network['shibuya'].endpoint,
    requestTimeout: appConfig.network['shibuya'].requestTimeout,
    faucetDripAmount: appConfig.network['shibuya'].amount,
});

const networks = {
    astarApi,
    shidenApi,
    shibuyaApi,
};

// only start the discord bot if there is a API token
// if (DISCORD_APP_TOKEN && DISCORD_APP_CLIENT_ID) {
//     // throw new Error('No app tokens or ID were given!');
//     await discordFaucetApp({
//         token: DISCORD_APP_TOKEN,
//         clientId: DISCORD_APP_CLIENT_ID,
//         apis: networks,
//     });
// }

// start the express app
const app = expressApp(networks);

exports.app = functions.https.onRequest(app);
