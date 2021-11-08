import {
    AstarFaucetApi,
    expressApp,
    DiscordCredentials,
    refreshSlashCommands,
    NetworkName,
    ASTAR_TOKEN_DECIMALS,
} from './clients';
import { DISCORD_APP_TOKEN, DISCORD_APP_CLIENT_ID, DISCORD_GUILD_ID, DISCORD_FAUCET_CHANNEL_ID } from './config';
import { Client, Intents, Interaction } from 'discord.js';
import BN from 'bn.js';
import Redis from 'ioredis';

/**
 * the main entry function for running the discord application
 */
export default async function app() {
    if (!DISCORD_APP_TOKEN || !DISCORD_APP_CLIENT_ID) {
        throw new Error('No app tokens or ID were given!');
    }

    await discordFaucetApp({ token: DISCORD_APP_TOKEN, clientId: DISCORD_APP_CLIENT_ID });
    await expressApp();
}

/**
 * The main controller for Discord API requests. Everything that is done from Discord should be written here
 */
const discordFaucetApp = async (appCred: DiscordCredentials) => {
    // todo: refactor this to handle multiple guilds
    if (!DISCORD_GUILD_ID || !DISCORD_FAUCET_CHANNEL_ID) {
        throw new Error(
            'No server information was given, please set the environment variable DISCORD_GUILD_ID and DISCORD_FAUCET_CHANNEL_ID',
        );
    }

    if (!process.env.FAUCET_SECRET_PHRASE) {
        throw new Error('No seed phrase was provided for the faucet account');
    }

    await refreshSlashCommands(appCred.token, appCred.clientId, DISCORD_GUILD_ID);

    const clientApp = new Client({ intents: [Intents.FLAGS.GUILDS] });

    // // Prepare for Redis client
    const redis = new Redis(process.env.REDIS_URL);

    // send 30 testnet tokens per call
    const oneToken = new BN(10).pow(new BN(ASTAR_TOKEN_DECIMALS));
    const dripAmount = new BN(15).mul(oneToken);

    const astarApi = new AstarFaucetApi({ faucetAccountSeed: process.env.FAUCET_SECRET_PHRASE, dripAmount });

    // todo: find a way to connect to both Dusty and Shibuya
    await astarApi.connectTo('shibuya');

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
            const networkName = interaction.options.data[0]?.value as NetworkName;
            const address = interaction.options.data[1]?.value;
            try {
                if (!address || typeof address !== 'string' || !networkName) {
                    throw new Error('No address was given!');
                }

                // Send 'Waiting' message to the user
                await interaction.deferReply();

                // Check if the user has already requested tokens or not
                // The user can request token one time within 1 hour.
                const requesterId = interaction.user.id;

                const anHourInMilliSecond = 60 * 60 * 1000;
                const now = Date.now();

                const lastRequestAt = Number(await redis.get(requesterId));
                const untilNextRequest = lastRequestAt + anHourInMilliSecond - now;
                if (untilNextRequest > 0)  {
                    const untilNextRequestMin = Math.floor(untilNextRequest / 1000 / 60);
                    const untilNextRequestSec = Math.floor( (untilNextRequest / 1000) - (untilNextRequestMin * 60) );
                    const replyMessage = `You already requested the Faucet within an hour. Try again in ${untilNextRequestMin} mins ${untilNextRequestSec} secs later.`;
                    throw new Error(replyMessage);
                }

                // Send token to the requester
                console.log(`Sending ${astarApi.formatBalance(dripAmount)} to ${address}`);

                await astarApi.sendTokenTo(address);
                const remainingFunds = await astarApi.getFaucetBalance();
                await interaction.editReply(
                    `Sent ${astarApi.formatBalance(
                        dripAmount,
                    )} to \`${address}\`. Please wait until the transaction gets finalized.\nRemaining funds: \`${remainingFunds}\`\nPlease send unused tokens back to the faucet \`${
                        astarApi.faucetAccount.address
                    }\``,
                );

                // Log the faucet request on Redis. Expires automatically in 60 mins.
                redis.set(requesterId, now, "PX", anHourInMilliSecond);

            } catch (err) {
                console.warn(err);
                await interaction.editReply({ content: `${err}` });
            }
        }
    });

    await clientApp.login(DISCORD_APP_TOKEN);
};
