import { BN } from '@polkadot/util';
import { ethers } from 'ethers';
import { MAINNET_FAUCET_AMOUNT, TESTNET_FAUCET_AMOUNT } from '..';
import { NetworkName, ASTAR_TOKEN_DECIMALS, AstarFaucetApi, Network } from '../../../clients';
import { getRequestTimestamps, canRequestFaucet, logRequest } from '../../../middlewares';

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

export const sendFaucet = async ({ address, network }: { address: string; network: NetworkName }): Promise<string> => {
    const faucetAccountSeed = process.env.FAUCET_SECRET_PHRASE;
    if (!faucetAccountSeed) {
        throw Error('secret phrase has not defined yet');
    }

    const isMainnet = network === 'shiden';
    const now = Date.now();
    const requesterId = generateFaucetId({
        network,
        address,
    });
    await canRequestFaucet(requesterId, now, isMainnet);

    const amount = isMainnet ? MAINNET_FAUCET_AMOUNT : TESTNET_FAUCET_AMOUNT;
    const dripAmount = ethers.utils.parseUnits(amount, ASTAR_TOKEN_DECIMALS).toString();
    const astarApi = new AstarFaucetApi({ faucetAccountSeed, dripAmount: new BN(dripAmount) });

    await astarApi.connectTo(network);
    const result = await astarApi.sendTokenTo(address);
    await logRequest(requesterId, now, isMainnet);
    return result.toJSON();
};
