export { generateFaucetId, getFaucetAmount, getFaucetInfo, sendFaucet } from './utils';

export const TESTNET_FAUCET_AMOUNT = Number(process.env.TESTNET_FAUCET_AMOUNT);

export const MAINNET_FAUCET_AMOUNT = Number(process.env.MAINNET_FAUCET_AMOUNT);
