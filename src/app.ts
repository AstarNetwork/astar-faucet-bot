import { cryptoWaitReady } from '@polkadot/util-crypto';

import { AstarFaucetApi, expressApp, Network, discordFaucetApp } from './clients';
import { DISCORD_APP_CLIENT_ID, DISCORD_APP_TOKEN } from './config';

/**
 * the main entry function for running the discord application
 */
export default async function app() {
    if (!DISCORD_APP_TOKEN || !DISCORD_APP_CLIENT_ID) {
        throw new Error('No app tokens or ID were given!');
    }

    const faucetAccountSeed = process.env.FAUCET_SECRET_PHRASE;
    if (!faucetAccountSeed) {
        throw Error('Secret phrase is not defined');
    }

    await cryptoWaitReady();
    const astarApi = new AstarFaucetApi({ faucetAccountSeed });

    await discordFaucetApp({
        token: DISCORD_APP_TOKEN,
        clientId: DISCORD_APP_CLIENT_ID,
        astarApi,
        network: Network.shibuya,
    });
    await expressApp(astarApi);
}
