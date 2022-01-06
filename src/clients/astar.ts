import { checkIsMainnet } from './../modules/faucet/utils/index';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { appConfig } from '../config';
import { formatBalance } from '@polkadot/util';
import { evmToAddress } from '@polkadot/util-crypto';
import type { KeyringPair } from '@polkadot/keyring/types';
import BN from 'bn.js';
import { checkAddressType } from '../helpers';
import { ethers } from 'ethers';
import { MAINNET_FAUCET_AMOUNT, TESTNET_FAUCET_AMOUNT } from '../modules/faucet';
import dedent from 'dedent';
import { postDiscordMessage } from '../modules/bot';
export enum Network {
    shiden = 'shiden',
    shibuya = 'shibuya',
    dusty = 'dusty',
}

export type NetworkName = Network.dusty | Network.shibuya | Network.shiden;

export interface FaucetOption {
    faucetAccountSeed: string;
}

// ss58 address prefix
export const ASTAR_SS58_FORMAT = 5;

export const ASTAR_TOKEN_DECIMALS = 18;

export class AstarFaucetApi {
    private _keyring: Keyring;
    private _faucetAccount: KeyringPair;
    private _api: ApiPromise;
    // token amount to send from the faucet per request

    public get faucetAccount() {
        return this._faucetAccount;
    }

    public get api() {
        return this._api;
    }

    constructor(options: FaucetOption) {
        this._keyring = new Keyring({ type: 'sr25519', ss58Format: ASTAR_SS58_FORMAT });
        this._faucetAccount = this._keyring.addFromUri(options.faucetAccountSeed, { name: 'Astar Faucet' });
        //this._api = new ApiPromise();
    }

    public async connectTo(networkName: NetworkName) {
        // get chain endpoint and types from the config file
        const endpoint = appConfig.network[networkName].endpoint;
        const chainMetaTypes = appConfig.network[networkName].types;

        // establish node connection with the endpoint
        const provider = new WsProvider(endpoint);
        const api = new ApiPromise({
            provider,
            types: chainMetaTypes,
        });

        const apiInst = await api.isReady;

        // get chain metadata
        const { tokenSymbol } = await apiInst.rpc.system.properties();
        const unit = tokenSymbol.unwrap()[0].toString();

        // set token display format
        formatBalance.setDefaults({
            unit,
            decimals: ASTAR_TOKEN_DECIMALS, // we can get this directly from the chain too
        });

        // subscribe to account balance changes
        // await apiInst.query.system.account(this._faucetAccount.address, ({ data }) => {
        //     const faucetReserve = formatBalance(data.free.toBn(), {
        //         withSi: true,
        //         withUnit: true,
        //     });
        //     console.log(`Faucet has ${faucetReserve}`);
        // });

        this._api = apiInst;

        return apiInst;
    }

    public async getFaucetBalance() {
        const addr = this._faucetAccount.address;

        const { data } = await this._api.query.system.account(addr);

        const faucetReserve = this.formatBalance(data.free.toBn());

        return faucetReserve;
    }

    public formatBalance(input: string | number | BN) {
        return formatBalance(input, {
            withSi: true,
            withUnit: true,
        });
    }

    // public async sendTokenTo(to: string, statusCb: (result: ISubmittableResult) => Promise<void>) {
    //     // send 30 testnet tokens per call
    //     //const faucetAmount = new BN(30).mul(new BN(10).pow(new BN(18)));

    //     let destinationAccount = to;
    //     const addrType = checkAddressType(to);

    //     // convert the h160 (evm) account to ss58 before sending the tokens
    //     if (addrType === 'H160') {
    //         destinationAccount = evmToAddress(to, ASTAR_SS58_FORMAT);
    //     }
    //     return await this._api.tx.balances
    //         .transfer(destinationAccount, this._dripAmount)
    //         .signAndSend(this._faucetAccount, statusCb);
    // }
    public async sendTokenTo({ to, dripAmount, network }: { to: string; dripAmount: BN; network: NetworkName }) {
        // send 30 testnet tokens per call
        //const faucetAmount = new BN(30).mul(new BN(10).pow(new BN(18)));

        await this.connectTo(network);
        let destinationAccount = to;
        const addrType = checkAddressType(to);

        // convert the h160 (evm) account to ss58 before sending the tokens
        if (addrType === 'H160') {
            destinationAccount = evmToAddress(to, ASTAR_SS58_FORMAT);
        }

        await this.checkFaucetBalance({ network }).catch((e) => {
            console.error(e.message);
        });
        return await this._api.tx.balances
            .transfer(destinationAccount, dripAmount)
            .signAndSend(this._faucetAccount, { nonce: -1 });
    }

    public async getNetworkUnit({ network }: { network: NetworkName }): Promise<string> {
        try {
            await this.connectTo(network);
            const properties = await this._api.rpc.system.properties();
            const tokenSymbol = properties.tokenSymbol.toJSON() as string[];
            return tokenSymbol[0];
            // return await this._api.rpc.system.properties;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error.message);
            return 'Something went wrong';
        }
        // switch (network) {
        //     case Network.shiden:
        //         return 'SDN';

        //     case Network.shibuya:
        //         return 'SBY';

        //     case Network.dusty:
        //         return 'PLD';

        //     // Enable after ASTR is launched
        //     // case Network.astar:
        //     //     return true

        //     default:
        //         return 'SBY';
        // }
    }

    public async getBalanceStatus({
        network,
    }: {
        network: NetworkName;
    }): Promise<{ balance: number; isShortage: boolean }> {
        const isMainnet = checkIsMainnet(network);
        const numOfTimes = 50;
        const threshold = isMainnet ? MAINNET_FAUCET_AMOUNT * numOfTimes : TESTNET_FAUCET_AMOUNT * numOfTimes;
        try {
            await this.connectTo(network);
            const account = await this._api.query.system.account(this._faucetAccount.address);
            const balance = Number(ethers.utils.formatUnits(account.data.free.toString(), ASTAR_TOKEN_DECIMALS));
            return { balance, isShortage: threshold > balance };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error.message);
            const balance = 0;
            return { balance, isShortage: threshold > balance };
        }
    }

    public async checkFaucetBalance({ network }: { network: Network }): Promise<{ balance: number; unit: string }> {
        try {
            const results = await Promise.all([this.getBalanceStatus({ network }), this.getNetworkUnit({ network })]);
            const { balance, isShortage } = results[0];
            const unit = results[1];

            const endpoint = process.env.DISCORD_WEBHOOK_URL;
            const mentionId = process.env.DISCORD_MENTION_ID;

            if (endpoint && isShortage) {
                const mention = mentionId && `<${mentionId}>`;
                const text = dedent`
                            ⚠️ The faucet wallet will run out of balance soon ${mention}
                            Address: ${this._faucetAccount.address}
                            Balance: ${balance.toFixed(0)} ${unit}
                            `;
                postDiscordMessage({ text, endpoint });
            }
            return { balance, unit };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error.message);
            return { balance: 0, unit: '' };
        }
    }
}
