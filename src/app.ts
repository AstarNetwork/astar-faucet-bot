import {
    AstarFaucetApi,
    expressApp,
    DiscordCredentials,
    refreshSlashCommands,
    NetworkName,
    ASTAR_TOKEN_DECIMALS,
} from './clients';
import { DISCORD_APP_TOKEN, DISCORD_APP_CLIENT_ID, DISCORD_GUILD_ID } from './config';
import { Client, Intents, Interaction } from 'discord.js';
import BN from 'bn.js';

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
    if (!DISCORD_GUILD_ID) {
        throw new Error(
            'No Discord bot token was provided, please set the environment variable DISCORD_APP_TOKEN and DISCORD_APP_CLIENT_ID',
        );
    }

    await refreshSlashCommands(appCred.token, appCred.clientId, DISCORD_GUILD_ID);

    const clientApp = new Client({ intents: [Intents.FLAGS.GUILDS] });

    if (!process.env.FAUCET_SECRET_PHRASE) {
        throw new Error('No seed phrase was provided for the faucet account');
    }
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
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'drip') {
            // note: the values are based on `src/config/appConfig.json`
            const networkName = interaction.options.data[0]?.value as NetworkName;
            const address = interaction.options.data[1]?.value;
            try {
                if (!address || typeof address !== 'string' || !networkName) {
                    throw new Error('No address was given!');
                }

                // todo: check if the user has already requested tokens or not
                await interaction.deferReply();

                const unsub = await astarApi.sendTokenTo(address, async (result) => {
                    console.log(`Sending tokens to ${address}`);

                    await interaction.editReply(
                        `Sending tokens to \`${address}\`. Please wait until the transaction has been finalized.`,
                    );

                    if (result.status.isInBlock) {
                        console.log(`Transaction included at blockHash ${result.status.asInBlock}`);

                        await interaction.editReply(
                            `Sent tokens to \`${address}\`. Transaction included at block hash \`${result.status.asInBlock}\``,
                        );
                    } else if (result.status.isFinalized) {
                        console.log(`Transaction finalized at block hash \`${result.status.asFinalized}\``);

                        const remainingFunds = await astarApi.getFaucetBalance();
                        await interaction.editReply(
                            `Sent tokens to \`${address}\`. Transaction finalized at blockHash ${result.status.asFinalized}.\nRemaining funds: \`${remainingFunds}\`\nPlease send unused tokens back to the faucet \`${astarApi.faucetAccount.address}\``,
                        );
                        unsub();
                    }
                });
            } catch (err) {
                console.warn(err);
                await interaction.editReply({ content: `${err}` });
            }
        }
    });

    await clientApp.login(DISCORD_APP_TOKEN);
};
