import { AstarFaucetApi, expressApp, DiscordCredentials, refreshSlashCommands, NetworkName } from './clients';
import { DISCORD_APP_TOKEN, DISCORD_APP_CLIENT_ID, DISCORD_GUILD_ID } from './config';
import { Client, Intents, Interaction } from 'discord.js';
import { checkAddressType } from './helpers';
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
    const dripAmount = new BN(30).mul(new BN(10).pow(new BN(18)));

    const astarApi = new AstarFaucetApi({ faucetAccountSeed: process.env.FAUCET_SECRET_PHRASE, dripAmount });

    await astarApi.connectTo('dusty');

    clientApp.on('ready', async () => {
        if (clientApp.user) {
            console.log(`${clientApp.user.tag} is ready!`);
        } else {
            console.log(`Failed to login as a user!`);
        }
    });

    // handle faucet token request
    clientApp.on('interactionCreate', async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'faucet') {
            // note: the values are based on `src/config/appConfig.json`
            const networkName = interaction.options.data[0]?.value as NetworkName;
            const address = interaction.options.data[1]?.value;
            try {
                if (!address || typeof address !== 'string') {
                    throw new Error('No address was given!');
                }

                const addrType = checkAddressType(address);

                await interaction.reply(
                    `Your options: network type: \`${networkName}\`. Address: \`${address}\`. Address type: \`${addrType}\`\nPlease send unused tokens back to the faucet \`${astarApi.faucetAccount.address}\``,
                );
            } catch (err) {
                await interaction.reply(`${err}`);
            }
        }
    });

    await clientApp.login(DISCORD_APP_TOKEN);

    return clientApp;
};
