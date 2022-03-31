import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import {
    appConfig,
    DISCORD_APP_CLIENT_ID,
    DISCORD_APP_TOKEN,
    DISCORD_FAUCET_CHANNEL_ID,
    DISCORD_GUILD_ID,
} from '../config';
import { Client, Intents, Interaction } from 'discord.js';
import { Network, NetworkApis } from '../types';

export interface DiscordCredentials {
    token: string;
    clientId: string;
    apis: NetworkApis;
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

/**
 * The main controller for Discord API requests. Everything that is done from Discord should be written here
 */
export const discordFaucetApp = async (appCred: DiscordCredentials) => {
    // todo: refactor this to handle multiple guilds
    if (!DISCORD_GUILD_ID || !DISCORD_FAUCET_CHANNEL_ID) {
        throw new Error(
            'No server information was given, please set the environment variable DISCORD_GUILD_ID and DISCORD_FAUCET_CHANNEL_ID',
        );
    }

    const { apis, token, clientId } = appCred;
    const { astarApi, shidenApi, shibuyaApi } = apis;
    await refreshSlashCommands(token, clientId, DISCORD_GUILD_ID);
    const clientApp = new Client({ intents: [Intents.FLAGS.GUILDS] });

    clientApp.on('ready', async () => {
        if (clientApp.user) {
            console.log(`${clientApp.user.tag} is ready!`);
        } else {
            console.log(`Failed to login to Discord`);
        }
    });

    // handle faucet token request
    clientApp.on('interactionCreate', async (interaction: Interaction) => {
        if (!interaction.isCommand() || interaction.channelId !== DISCORD_FAUCET_CHANNEL_ID) return;

        const { commandName } = interaction;

        if (commandName === 'drip') {
            // note: the values are based on `src/config/appConfig.json`
            const networkName = interaction.options.data[0]?.value as Network;
            const address = interaction.options.data[1]?.value;
            try {
                if (!address || typeof address !== 'string' || !networkName) {
                    throw new Error('No address was given!');
                }

                // Send 'Waiting' message to the user
                await interaction.deferReply();

                // Check if the user has already requested tokens or not
                const requesterId = interaction.user.id;
                const now = Date.now();
                //await canRequestFaucet(requesterId, now);

                let dripAmount = '';
                let remainingFunds = '';
                switch (networkName) {
                    case Network.astar:
                        await astarApi.drip(address);
                        dripAmount = astarApi.faucetAmount;
                        remainingFunds = await astarApi.getBalance();
                        break;
                    case Network.shiden:
                        await shidenApi.drip(address);
                        dripAmount = shidenApi.faucetAmount;
                        remainingFunds = await shidenApi.getBalance();
                        break;
                    default:
                        await shibuyaApi.drip(address);
                        dripAmount = shibuyaApi.faucetAmount;
                        remainingFunds = await shibuyaApi.getBalance();
                        break;
                }

                //await astarApi.sendTokenTo({ to: address, dripAmount, network });
                //await astarApi.drip(address);

                // Send token to the requester
                console.log(`Sending ${dripAmount} to ${address}`);

                await interaction.editReply(
                    `Sent ${dripAmount} to \`${address}\`. Please wait until the transaction gets finalized.\nRemaining funds: \`${remainingFunds}\`\nPlease send unused tokens back to the faucet \`${astarApi.faucetAccount.address}\``,
                );

                // Log the faucet request.
                //await logRequest(requesterId, now);
            } catch (err) {
                console.warn(err);
                await interaction.editReply({ content: `${err}` });
            }
        }
    });

    await clientApp.login(DISCORD_APP_TOKEN);
};
