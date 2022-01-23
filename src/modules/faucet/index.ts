import { Network } from './../../clients/astar';
export { generateFaucetId, getFaucetAmount, getFaucetInfo, sendFaucet, getTokenUnit } from './utils';

export const evmFaucetPrivateKey = process.env.EVM_FAUCET_PRIVATE_KEY;

export const FAUCET_AMOUNT = {
    [Network.astar]: Number(process.env.ASTAR_FAUCET_AMOUNT),
    [Network.shiden]: Number(process.env.SHIDEN_FAUCET_AMOUNT),
    [Network.shibuya]: Number(process.env.TESTNET_FAUCET_AMOUNT),
    [Network.dusty]: Number(process.env.TESTNET_FAUCET_AMOUNT),
};
