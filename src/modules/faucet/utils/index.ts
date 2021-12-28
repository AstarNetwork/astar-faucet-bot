import { BN } from '@polkadot/util';
import { ethers } from 'ethers';
import { MAINNET_FAUCET_AMOUNT, TESTNET_FAUCET_AMOUNT } from '..';
import { AstarFaucetApi, ASTAR_TOKEN_DECIMALS, Network, NetworkName } from '../../../clients';
import { canRequestFaucet, getRequestTimestamps, logRequest } from '../../../middlewares';
import { postDiscordMessage } from '../../bot';
import dedent from 'dedent';

export const getFaucetAmount = (network: Network): number => {
    const isMainnet = network === Network.shiden;
    const amount = isMainnet ? Number(MAINNET_FAUCET_AMOUNT) : Number(TESTNET_FAUCET_AMOUNT);
    return amount;
};

export const verifyNetwork = (network: string): true | Error => {
    const networks = Object.values(Network);
    const networkResult = networks.find((it: string) => it === network);
    if (networkResult) {
        return true;
    }
    throw Error('invalid network');
};

export const generateFaucetId = ({ network, address }: { network: NetworkName; address: string }): string => {
    verifyNetwork(network);
    return `${network}:${address}`;
};

export const getFaucetInfo = async ({
    network,
    address,
    astarApi,
}: {
    network: Network;
    address: string;
    astarApi: AstarFaucetApi;
}) => {
    const isMainnet = network === Network.shiden;
    const requesterId = generateFaucetId({ network, address });

    const results = await Promise.all([
        getRequestTimestamps({ requesterId, isMainnet }),
        astarApi.getNetworkUnit({ network }),
    ]);
    const timestamps = results[0];
    const unit = results[1];

    const faucet = {
        amount: getFaucetAmount(network),
        unit,
    };
    return { timestamps, faucet };
};

export const sendFaucet = async ({
    address,
    network,
    astarApi,
}: {
    address: string;
    network: NetworkName;
    astarApi: AstarFaucetApi;
}): Promise<string> => {
    const isMainnet = network === Network.shiden;
    const now = Date.now();
    const requesterId = generateFaucetId({
        network,
        address,
    });
    await canRequestFaucet(requesterId, now, isMainnet);

    const amount = isMainnet ? MAINNET_FAUCET_AMOUNT : TESTNET_FAUCET_AMOUNT;
    const dripAmount = ethers.utils.parseUnits(amount.toString(), ASTAR_TOKEN_DECIMALS).toString();
    const result = await astarApi.sendTokenTo({ to: address, network, dripAmount: new BN(dripAmount) });

    await logRequest(requesterId, now, isMainnet);
    return result.hash.toString();
};

export const checkIsBalanceEnough = ({ network, balance }: { network: Network; balance: number }): boolean => {
    const threshold = network === Network.shiden ? MAINNET_FAUCET_AMOUNT * 500000 : TESTNET_FAUCET_AMOUNT * 50;
    return balance > threshold;
};

export const getFaucetBalance = async ({ network, astarApi }: { network: Network; astarApi: AstarFaucetApi }) => {
    const results = await Promise.all([astarApi.getBalance({ network }), astarApi.getNetworkUnit({ network })]);
    const balance = results[0];
    const unit = results[1];
    const isBalanceEnough = checkIsBalanceEnough({ network, balance });

    const channelId = process.env.DISCORD_WEBHOOKS;
    const mentionId = process.env.DISCORD_MENTION_ID;

    if (channelId && !isBalanceEnough) {
        const mention = mentionId && `<${mentionId}>`;
        const text = dedent`
                ⚠️ The faucet wallet will run out of balance soon ${mention}
                Address: ${astarApi.faucetAccount.address}
                Balance: ${balance.toFixed(0)} ${unit}
                `;
        postDiscordMessage({ text, channelId });
    }

    return { balance, unit };
};
