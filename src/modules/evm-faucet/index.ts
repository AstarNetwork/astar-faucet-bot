export { evmFaucet, generateFaucetId } from './utils';
export enum Network {
    shiden = 'shiden',
    shibuya = 'shibuya',
}
export type ChainNetwork = Network.shibuya | Network.shiden;

export const FAUCET_AMOUNT = '0.002';
