import { canRequestFaucet, logRequest } from './../../../middlewares/requestFilter';
import { evmFaucetPrivateKey } from './../../env';
import { Network, FAUCET_AMOUNT } from './../';
import { TransactionConfig } from 'web3-eth';
import { createWeb3Instance } from '../../web3';
import { logger } from '../../logger';
import Web3 from 'web3';

const verifyQuery = ({ network, address }: { network: Network; address: string }): true | Error => {
    const networks = Object.values(Network);
    const networkResult = networks.find((it: string) => it === network);
    const web3 = new Web3();
    const addressResult = web3.utils.checkAddressChecksum(address);
    if (networkResult && addressResult) {
        return true;
    }
    throw Error('invalid parameter');
};

export const generateFaucetId = ({ network, address }: { network: Network; address: string }): string => {
    verifyQuery({ network, address });
    const web3 = new Web3();
    const toAddress = web3.utils.toChecksumAddress(address);
    return `${network}:${toAddress}`;
};

export const evmFaucet = async ({
    network,
    address,
}: {
    network: Network;
    address: string;
}): Promise<{ blockNumber: number; blockHash: string }> => {
    verifyQuery({ network, address });
    const web3 = createWeb3Instance(network);
    const toAddress = web3.utils.toChecksumAddress(address);

    const now = Date.now();
    const requesterId = `${network}:${toAddress}`;
    await canRequestFaucet(requesterId, now, true);

    const privateKey = evmFaucetPrivateKey;
    if (!privateKey) {
        throw Error('Faucet private key is not defined');
    }

    const hotWallet = web3.eth.accounts.privateKeyToAccount(privateKey);

    const transaction: TransactionConfig = {
        nonce: await web3.eth.getTransactionCount(hotWallet.address),
        value: web3.utils.toHex(web3.utils.toWei(FAUCET_AMOUNT, 'ether')),
        from: hotWallet.address,
        to: toAddress,
    };

    const gasPrice = await web3.eth.getGasPrice();
    const gas = await web3.eth.estimateGas({ ...transaction, gasPrice });
    logger.debug({ transaction: { ...transaction, gas, gasPrice } }, 'Will send transaction');
    const rawTransaction = { ...transaction, gas, gasPrice };
    const signedTx = await hotWallet.signTransaction(rawTransaction);

    if (!signedTx.rawTransaction) {
        throw Error('invalid transaction');
    }

    const { blockNumber, blockHash } = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    if (blockNumber > 0) {
        await logRequest(requesterId, now, true);
    }

    return { blockNumber, blockHash };
};

export const getFaucetAmount = (network: Network): { amount: number; unit: string } => {
    if (network === Network.shiden) {
        return { amount: Number(FAUCET_AMOUNT), unit: 'SDN' };
    }
    return { amount: Number(FAUCET_AMOUNT), unit: 'SBY' };
};
