import { AstarFaucetApi } from '../clients';

export interface NetworkApis {
    astarApi: AstarFaucetApi;
    shidenApi: AstarFaucetApi;
    shibuyaApi: AstarFaucetApi;
}

export type AddressType = 'SS58' | 'H160';

export enum Network {
    astar = 'astar',
    shiden = 'shiden',
    shibuya = 'shibuya',
}
