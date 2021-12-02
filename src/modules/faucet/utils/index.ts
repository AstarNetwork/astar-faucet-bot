import Web3 from 'web3';
import { FAUCET_AMOUNT, Network } from '..';
export { checkAddressFormat } from './address';
export { evmFaucet } from './evm';

export const getFaucetAmount = (network: Network): { amount: number; unit: string } => {
    if (network === Network.shiden) {
        return { amount: Number(FAUCET_AMOUNT), unit: 'SDN' };
    }
    // Memo: 15SBY?
    return { amount: Number(FAUCET_AMOUNT), unit: 'SBY' };
};

export const verifyQuery = ({ network, address }: { network: Network; address: string }): true | Error => {
    const networks = Object.values(Network);
    const networkResult = networks.find((it: string) => it === network);
    const web3 = new Web3();
    const addressResult = web3.utils.checkAddressChecksum(address);
    if (networkResult && addressResult) {
        return true;
    }
    throw Error('invalid parameter');
};

export const generateFaucetId = ({ network, address }: { network: Network; address: string }): string => {
    verifyQuery({ network, address });
    const web3 = new Web3();
    const toAddress = web3.utils.toChecksumAddress(address);
    return `${network}:${toAddress}`;
};
