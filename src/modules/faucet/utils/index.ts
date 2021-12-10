import { BN } from '@polkadot/util';
import { ethers } from 'ethers';
import { MAINNET_FAUCET_AMOUNT, TESTNET_FAUCET_AMOUNT } from '..';
import { AstarFaucetApi, ASTAR_TOKEN_DECIMALS, Network, NetworkName } from '../../../clients';
import { canRequestFaucet, getRequestTimestamps, logRequest } from '../../../middlewares';

export const getFaucetAmount = (network: Network): { amount: number; unit: string } => {
    const isMainnet = network === 'shiden';
    const amount = isMainnet ? Number(MAINNET_FAUCET_AMOUNT) : Number(TESTNET_FAUCET_AMOUNT);

    if (network === Network.shiden) {
        return { amount, unit: 'SDN' };
    }
    return { amount, unit: 'SBY' };
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

export const getFaucetInfo = async ({ network, address }: { network: Network; address: string }) => {
    const isMainnet = network === Network.shiden;
    const requesterId = generateFaucetId({ network, address });
    const timestamps = await getRequestTimestamps({ requesterId, isMainnet });
    const faucet = getFaucetAmount(network);
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
    await astarApi.connectTo(network);

    const amount = isMainnet ? MAINNET_FAUCET_AMOUNT : TESTNET_FAUCET_AMOUNT;
    const dripAmount = ethers.utils.parseUnits(amount.toString(), ASTAR_TOKEN_DECIMALS).toString();
    const result = await astarApi.sendTokenTo({ to: address, dripAmount: new BN(dripAmount) });

    if (network !== Network.shibuya) {
        await astarApi.connectTo(Network.shibuya);
    }

    await logRequest(requesterId, now, isMainnet);
    return result.hash.toString();
};
