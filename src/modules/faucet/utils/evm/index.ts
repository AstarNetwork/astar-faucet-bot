import { postDiscordMessage } from './../../../bot/index';
import Web3 from 'web3';
import { TransactionConfig } from 'web3-eth';
import { getTokenUnit } from '..';
import { Network } from '../../../../clients';
import { evmFaucetPrivateKey, FAUCET_AMOUNT, safeBalOfTxTimes } from './../../index';
import dedent from 'dedent';

export const createWeb3Instance = (network: Network) => {
    return new Web3(
        new Web3.providers.HttpProvider(
            network === Network.astar
                ? 'https://rpc.astar.network:8545'
                : network === Network.shiden
                ? 'https://evm.shiden.astar.network'
                : 'https://rpc.shibuya.astar.network:8545',
        ),
    );
};

const checkIsShortage = async ({
    balance,
    network,
    address,
}: {
    balance: number;
    network: Network;
    address: string;
}): Promise<boolean> => {
    const numOfTimes = safeBalOfTxTimes;
    const faucetAmount = FAUCET_AMOUNT[network];
    const threshold = faucetAmount * numOfTimes;
    const isShortage = threshold > balance;

    const endpoint = process.env.DISCORD_WEBHOOK_URL;
    const mentionId = process.env.DISCORD_MENTION_ID;
    const unit = getTokenUnit(network);

    if (endpoint && isShortage) {
        const mention = mentionId && `<${mentionId}>`;
        const text = dedent`
                    ⚠️ The faucet wallet will run out of balance soon ${mention}
                    Address: ${address}
                    Balance: ${balance.toFixed(0)} ${unit}
                    `;
        postDiscordMessage({ text, endpoint });
    }

    return isShortage;
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
    const balance = await web3.eth.getBalance(hotWallet.address);
    const formattedBalance = web3.utils.fromWei(balance, 'ether');
    await checkIsShortage({ network, address: hotWallet.address, balance: Number(formattedBalance) });

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
