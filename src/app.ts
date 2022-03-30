import { cryptoWaitReady } from '@polkadot/util-crypto';

import { AstarFaucetApi, expressApp, Network, discordFaucetApp } from './clients';
import { DISCORD_APP_CLIENT_ID, DISCORD_APP_TOKEN, appConfig } from './config';

/**
 * the main entry function for running the discord application
 */
export default async function app() {
    const faucetAccountSeed = process.env.FAUCET_SECRET_PHRASE;
    if (!faucetAccountSeed) {
        throw Error('Secret phrase is not defined');
    }

    // todo: make this determined by the client flag
    const networkName = 'shibuya';

    const endpoint = appConfig.network[networkName].endpoint;
    const faucetAmount = appConfig.network[networkName].amount;

    await cryptoWaitReady();
    const astarApi = await new AstarFaucetApi({
        mnemonic: faucetAccountSeed,
        endpoint,
        requestTimeout: 180,
        faucetAmount,
    }).start();

    // only start the discord bot if there is a API token
    if (DISCORD_APP_TOKEN && DISCORD_APP_CLIENT_ID) {
        // throw new Error('No app tokens or ID were given!');
        await discordFaucetApp({
            token: DISCORD_APP_TOKEN,
            clientId: DISCORD_APP_CLIENT_ID,
            astarApi,
        });
    }

    // start the express app
    await expressApp(astarApi);
}
