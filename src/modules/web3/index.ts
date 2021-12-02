import { evmEndpoint } from '../faucet/index';
import Web3 from 'web3';
import { Network } from '../faucet';

export const createWeb3Instance = (network: Network) => {
    return new Web3(new Web3.providers.HttpProvider(evmEndpoint[network]));
};
