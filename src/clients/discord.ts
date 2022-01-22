import { Network } from './astar';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { AstarFaucetApi } from '.';
import { DISCORD_APP_CLIENT_ID, appConfig } from '../config';

export interface DiscordCredentials {
    token: string;
    clientId: string;
    astarApi: AstarFaucetApi;
    network: Network;
}

const concatBotScope = (scopes: string[]) => {
    // bot permissions are separated by a percent-encoded white space
    return scopes.join('%20');
};

export const appOauthInstallUrl = () => {
    if (!DISCORD_APP_CLIENT_ID) throw new Error('No client ID provided');

    // used to add the bot to a server (https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APP_CLIENT_ID}&permissions=${
        appConfig.discord.permissions
    }&scope=${concatBotScope(appConfig.discord.scope)}`;
};

export const refreshSlashCommands = async (appToken: string, appClientId: string, guildId: string) => {
    // generally, you only need to run this function when the slash command changes
    const rest = new REST({ version: '9' }).setToken(appToken);
    try {
        console.log('Started refreshing application (/) commands.');

        // note: the `DISCORD_GUILD_ID` is hard-coded in this project, but this can be changed to read it from a remote database
        await rest.put(Routes.applicationGuildCommands(appClientId, guildId), {
            body: appConfig.discord.slashCommands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};
