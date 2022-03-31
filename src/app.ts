import { cryptoWaitReady } from '@polkadot/util-crypto';

import { AstarFaucetApi, expressApp, discordFaucetApp } from './clients';
import { DISCORD_APP_CLIENT_ID, DISCORD_APP_TOKEN, appConfig } from './config';

import '@polkadot/api-augment';

/**
 * the main entry function for running the discord application
 */
export default async function app() {
    const faucetAccountSeed = process.env.FAUCET_SECRET_PHRASE;
    if (!faucetAccountSeed) {
        throw Error('Secret phrase is not defined');
    }
    await cryptoWaitReady();

    const astarApi = await new AstarFaucetApi({
        mnemonic: faucetAccountSeed,
        endpoint: appConfig.network['astar'].endpoint,
        requestTimeout: appConfig.network['astar'].requestTimeout,
        faucetDripAmount: appConfig.network['astar'].amount,
    }).start();

    const shidenApi = await new AstarFaucetApi({
        mnemonic: faucetAccountSeed,
        endpoint: appConfig.network['shiden'].endpoint,
        requestTimeout: appConfig.network['shiden'].requestTimeout,
        faucetDripAmount: appConfig.network['shiden'].amount,
    }).start();

    const shibuyaApi = await new AstarFaucetApi({
        mnemonic: faucetAccountSeed,
        endpoint: appConfig.network['shibuya'].endpoint,
        requestTimeout: appConfig.network['shibuya'].requestTimeout,
        faucetDripAmount: appConfig.network['shibuya'].amount,
    }).start();

    const networks = {
        astarApi,
        shidenApi,
        shibuyaApi,
    };

    // only start the discord bot if there is a API token
    if (DISCORD_APP_TOKEN && DISCORD_APP_CLIENT_ID) {
        // throw new Error('No app tokens or ID were given!');
        await discordFaucetApp({
            token: DISCORD_APP_TOKEN,
            clientId: DISCORD_APP_CLIENT_ID,
            apis: networks,
        });
    }

    // start the express app
    await expressApp(networks);
}
