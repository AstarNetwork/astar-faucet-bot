export { evmFaucet, generateFaucetId } from './utils';

export enum Network {
    shiden = 'shiden',
    shibuya = 'shibuya',
}

export const evmEndpoint = {
    [Network.shiden]: 'https://rpc.shiden.astar.network:8545',
    [Network.shibuya]: 'https://rpc.shibuya.astar.network:8545',
};
export type ChainNetwork = Network.shibuya | Network.shiden;

export const FAUCET_AMOUNT = '0.002';
