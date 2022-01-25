import { BN } from '@polkadot/util';
import { ethers } from 'ethers';
import { FAUCET_AMOUNT } from '../index';
import { AstarFaucetApi, ASTAR_TOKEN_DECIMALS, Network, NetworkName } from '../../../clients';
import { canRequestFaucet, getRequestTimestamps, logRequest } from '../../../middlewares';
import { isEthereumAddress } from '@polkadot/util-crypto';
import { evmFaucet } from './evm';

export const checkIsMainnet = (network: Network): boolean => {
    switch (network) {
        case Network.shiden:
            return true;

        case Network.astar:
            return true;

        case Network.shibuya:
            return false;

        case Network.dusty:
            return false;

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
        case Network.astar:
            return 'ASTR';

        default:
            return 'SBY';
    }
};

export const getFaucetAmount = (network: Network): number => {
    return FAUCET_AMOUNT[network];
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

    const amount = FAUCET_AMOUNT[network];
    const dripAmount = ethers.utils.parseUnits(amount.toString(), ASTAR_TOKEN_DECIMALS).toString();
    let hash = '';

    if (isEthereumAddress(address)) {
        const { blockNumber, blockHash } = await evmFaucet({ network, address, dripAmount });
        // Memo: store the log after the tx is confirmed
        blockNumber > 0 && (await logRequest(requesterId, now, isMainnet));
        hash = blockHash;
    } else {
        const result = await astarApi.sendTokenTo({ to: address, network, dripAmount: new BN(dripAmount) });
        hash = result.hash.toString();
        await logRequest(requesterId, now, isMainnet);
    }

    return hash;
};
