import { evmEndpoint } from './../evm-faucet/index';
import Web3 from 'web3';
import { Network } from '../evm-faucet';

export const createWeb3Instance = (network: Network) => {
    return new Web3(new Web3.providers.HttpProvider(evmEndpoint[network]));
};
