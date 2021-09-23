import { checkAddress, isEthereumAddress } from '@polkadot/util-crypto';
import { ASTAR_SS58_FORMAT } from '../clients';

export type AddressType = 'SS58' | 'H160';

export const checkAddressType = (address: string) => {
    const addressType: AddressType = isEthereumAddress(address) ? 'H160' : 'SS58';

    // we already perform a check for H160 address string from the above line, so we only need to perform a check if it's a valid ss58 address string
    if (addressType === 'SS58') {
        const checkRes = checkAddress(address, ASTAR_SS58_FORMAT);

        // throw en error if the address validation failed and the error message string is not null
        if (checkRes[1] !== null) {
            throw new Error(checkRes[1]);
        }
    }

    return addressType;
};
