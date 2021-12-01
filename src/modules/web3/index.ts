import Web3 from 'web3';
import { Network } from '../evm-faucet';

export const createWeb3Instance = (network: Network) => {
    return new Web3(
        new Web3.providers.HttpProvider(
            network === Network.shiden
                ? 'https://rpc.shiden.astar.network:8545'
                : 'https://rpc.shibuya.astar.network:8545',
        ),
    );
};
