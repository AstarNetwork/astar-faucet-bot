import Web3 from 'web3';
import { TransactionConfig } from 'web3-eth';
import { Network } from '../../../../clients';
import { evmFaucetPrivateKey } from './../../index';

export const createWeb3Instance = (network: Network) => {
    return new Web3(
        new Web3.providers.HttpProvider(
            network === Network.astar
                ? 'https://rpc.astar.network:8545'
                : network === Network.shiden
                ? 'https://rpc.shiden.astar.network:8545'
                : 'https://rpc.shibuya.astar.network:8545',
        ),
    );
};

export const evmFaucet = async ({
    network,
    address,
    dripAmount,
}: {
    network: Network;
    address: string;
    dripAmount: string;
}): Promise<{ blockNumber: number; blockHash: string }> => {
    const web3 = createWeb3Instance(network);
    const toAddress = web3.utils.toChecksumAddress(address);
    const addressCheck = web3.utils.checkAddressChecksum(toAddress);
    if (!addressCheck) {
        throw Error('invalid address');
    }

    const privateKey = evmFaucetPrivateKey;
    if (!privateKey) {
        throw Error('Faucet private key is not defined');
    }

    const hotWallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    const transaction: TransactionConfig = {
        nonce: await web3.eth.getTransactionCount(hotWallet.address),
        value: web3.utils.toHex(dripAmount),
        from: hotWallet.address,
        to: toAddress,
    };

    const gasPrice = await web3.eth.getGasPrice();
    const gas = await web3.eth.estimateGas({ ...transaction, gasPrice });
    const rawTransaction = { ...transaction, gas, gasPrice };
    const signedTx = await hotWallet.signTransaction(rawTransaction);

    if (!signedTx.rawTransaction) {
        throw Error('invalid transaction');
    }

    const { blockNumber, blockHash } = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return { blockNumber, blockHash };
};
