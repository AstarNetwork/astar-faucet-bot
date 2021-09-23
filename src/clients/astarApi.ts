import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { appConfig } from '../config';

// ss58 address prefix
export const ASTAR_SS58_FORMAT = 5;

export let keyringInst: Keyring;

export enum NetworkName {
    Dusty = 0,
    Shibuya = 1,
}

export const initAstarApi = async (endpoint: string, networkName: NetworkName) => {
    const provider = new WsProvider(endpoint);

    // note: the order of the property (network name) is important
    const chainMetaTypes = (appConfig.network as any)[networkName].types;

    // todo: add network types
    const api = new ApiPromise({
        provider,
        types: chainMetaTypes,
    });

    return await api.isReady;
};

export const initFaucetAccountPair = () => {
    const phrase = process.env.FAUCET_SECRET_PHRASE;
    if (!phrase) {
        throw new Error('No secret phrase for the faucet account was provided!');
    }
    if (!keyringInst) {
        keyringInst = new Keyring({ type: 'sr25519', ss58Format: ASTAR_SS58_FORMAT });

        return keyringInst.addFromUri(phrase, { name: 'Astar Faucet' });
    } else {
        // gets the first keyring pair from the global keyring inst. This assumes that the faucet account is the only account or the first account
        return keyringInst.pairs[0];
    }
};
