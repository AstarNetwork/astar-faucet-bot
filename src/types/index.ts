import { FaucetApi } from '../clients';

export interface NetworkApis {
    astarApi: FaucetApi;
    shidenApi: FaucetApi;
    shibuyaApi: FaucetApi;
}

export type AddressType = 'SS58' | 'H160';

export enum Network {
    astar = 'astar',
    shiden = 'shiden',
    shibuya = 'shibuya',
}

interface Timestamps {
    lastRequestAt: number;
    nextRequestAt: number;
}

export interface FaucetInfo {
    timestamps: Timestamps;
    faucet: {
        amount: number;
        unit: string;
    };
}
