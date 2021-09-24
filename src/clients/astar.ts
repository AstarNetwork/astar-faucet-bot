import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { appConfig } from '../config';
import { formatBalance } from '@polkadot/util';
import BN from 'bn.js';

// ss58 address prefix
export const ASTAR_SS58_FORMAT = 5;

export let keyringInst: Keyring;

export type NetworkName = 'dusty' | 'shibuya';

export const initAstarApi = async (networkName: NetworkName) => {
    const endpoint = appConfig.network[networkName].endpoint;
    const chainMetaTypes = appConfig.network[networkName].types;

    const provider = new WsProvider(endpoint);

    // todo: add network types
    const api = new ApiPromise({
        provider,
        types: chainMetaTypes,
    });

    return await api.isReady;
};

export const getFaucetAccountPair = () => {
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

export const astarApp = async () => {
    const chainApi = await initAstarApi('dusty');

    const { tokenSymbol } = await chainApi.rpc.system.properties();
    const unit = tokenSymbol.unwrap()[0].toString();

    formatBalance.setDefaults({
        unit,
        decimals: 15,
    });

    const faucetAccount = getFaucetAccountPair();

    const { data } = await chainApi.query.system.account(faucetAccount.address);
    const faucetReserve = formatBalance(data.free.toBn(), {
        withSi: true,
        withUnit: true,
    });

    console.log(faucetReserve);
};
