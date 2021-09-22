import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { DISCORD_APP_TOKEN, DISCORD_APP_CLIENT_ID, DISCORD_GUILD_ID, appConfig } from '../config';

export interface DiscordCredentials {
    token: string;
    clientId: string;
}

const concatBotScope = (scopes: string[]) => {
    // bot permissions are separated by a percent-encoded white space
    return scopes.join('%20');
};

export const appOauthInstallUrl = () => {
    if (!DISCORD_APP_CLIENT_ID) throw new Error('No client ID provided');

    // used to add the bot to a server (https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APP_CLIENT_ID}&permissions=${
        appConfig.permissions
    }&scope=${concatBotScope(appConfig.scope)}`;
};

const refreshSlashCommands = async (appToken: string, appClientId: string, guildId: string) => {
    // generally, you only need to run this function when the slash command changes
    const rest = new REST({ version: '9' }).setToken(appToken);
    try {
        console.log('Started refreshing application (/) commands.');

        // note: the `DISCORD_GUILD_ID` is hard-coded in this project, but this can be changed to read it from a remote database
        await rest.put(Routes.applicationGuildCommands(appClientId, guildId), {
            body: appConfig.slashCommands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

/**
 * The main controller for Discord API requests. Everything that is done from Discord should be written here
 */
export const discordApp = async (appCred: DiscordCredentials) => {
    // todo: refactor this to handle multiple guilds
    if (!DISCORD_GUILD_ID) {
        throw new Error(
            'No Discord bot token was provided, please set the environment variable DISCORD_APP_TOKEN and DISCORD_APP_CLIENT_ID',
        );
    }

    await refreshSlashCommands(appCred.token, appCred.clientId, DISCORD_GUILD_ID);

    const clientApp = new Client({ intents: [Intents.FLAGS.GUILDS] });

    clientApp.on('ready', async () => {
        if (clientApp.user) {
            console.log(`${clientApp.user.tag} is ready!`);
        } else {
            console.log(`Failed to login as a user!`);
        }
    });

    // a ping-pong test
    clientApp.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply('Pong!');
        } else if (commandName === 'greet') {
            await interaction.reply('Hello ' + interaction.user.tag);
        } else if (commandName === 'blep') {
            await interaction.reply(`You chose ${JSON.stringify(interaction.options.data)}`);
        }
    });

    await clientApp.login(DISCORD_APP_TOKEN);

    return clientApp;
};
