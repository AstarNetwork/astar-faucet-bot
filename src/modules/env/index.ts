export const logLevel = process.env.NODE_ENV === 'production' ? 'debug' : 'trace';

export const evmFaucetPrivateKey = process.env.EVM_FAUCET_HOT_WALLET_PRIVATE_KEY || undefined;
