import { evmToAddress, validateAddress } from '@polkadot/util-crypto';
import Web3 from 'web3';
import { ASTAR_SS58_FORMAT } from '../../../../clients';

export const checkSumEvmAddress = (evmAddress: string): string => {
    const web3 = new Web3();
    return web3.utils.toChecksumAddress(evmAddress);
};

export const toSS58Address = (h160Address: string) => {
    const address = checkSumEvmAddress(h160Address);
    return evmToAddress(address, ASTAR_SS58_FORMAT);
};

export const checkAddressFormat = (address: string): { type: 'SS58' | 'H160' } | Error => {
    if (validateAddress(address) && address.slice(0, 2) !== '0x') {
        return { type: 'SS58' };
    }

    const web3 = new Web3();

    // Memo: returns `false` if evmAddress was converted from SS58
    const isEvmAddress = web3.utils.checkAddressChecksum(address);

    // Memo: check if the given evmAddress is convertible
    const ss58Address = toSS58Address(address);
    if (ss58Address.length > 0 || isEvmAddress) {
        return { type: 'H160' };
    }

    throw Error('invalid address');
};
