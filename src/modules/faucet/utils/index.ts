import { BN } from '@polkadot/util';
import { ethers } from 'ethers';
import { MAINNET_FAUCET_AMOUNT, TESTNET_FAUCET_AMOUNT } from '..';
import { AstarFaucetApi, ASTAR_TOKEN_DECIMALS, Network, NetworkName } from '../../../clients';
import { canRequestFaucet, getRequestTimestamps, logRequest } from '../../../middlewares';

export const checkIsMainnet = (network: Network): boolean => {
    switch (network) {
        case Network.shiden:
            return true;

        case Network.shibuya:
            return false;

        case Network.dusty:
            return false;

        // Enable after ASTR is launched
        // case Network.astar:
        //     return true

        default:
            return false;
    }
};

export const getTokenUnit = (network: Network): string => {
    switch (network) {
        case Network.shiden:
            return 'SDN';
        case Network.shibuya:
            return 'SBY';
        case Network.dusty:
            return 'PLD';
        // Enable after ASTR is launched
        // case Network.astar:
        //     return ASTR

        default:
            return 'SBY';
    }
};

export const getFaucetAmount = (network: Network): number => {
    const isMainnet = checkIsMainnet(network);
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

export const getFaucetInfo = async ({ network, address }: { network: Network; address: string }) => {
    const isMainnet = checkIsMainnet(network);
    const requesterId = generateFaucetId({ network, address });

    const timestamps = await getRequestTimestamps({ requesterId, isMainnet });
    const unit = getTokenUnit(network);

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
    const isMainnet = checkIsMainnet(network);
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
