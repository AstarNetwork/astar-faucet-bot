import { discordApp, expressApp } from './clients';
import { DISCORD_APP_TOKEN, DISCORD_APP_CLIENT_ID } from './config';

/**
 * the main entry function for running the discord application
 */
export default async function app() {
    if (!DISCORD_APP_TOKEN || !DISCORD_APP_CLIENT_ID) {
        throw new Error('No app tokens or ID were given!');
    }
    await discordApp({ token: DISCORD_APP_TOKEN, clientId: DISCORD_APP_CLIENT_ID });
    await expressApp();
}
