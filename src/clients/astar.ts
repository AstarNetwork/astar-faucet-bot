/* eslint-disable @typescript-eslint/no-explicit-any */
import * as helpers from '../helpers';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { ApiTypes, SignerOptions, SubmittableExtrinsic } from '@polkadot/api/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import { formatBalance } from '@polkadot/util';
import { evmToAddress, mnemonicGenerate, checkAddress, isEthereumAddress, isAddress } from '@polkadot/util-crypto';
import BN from 'bn.js';
import { fetchTip } from '../helpers';

export type ExtrinsicPayload = SubmittableExtrinsic<'promise'>;

export interface FaucetOption {
    endpoint: string;
    mnemonic: string;
    // waiting time for the faucet request in seconds
    requestTimeout: number;
    faucetDripAmount: number;
}

// ss58 address prefix
export const ASTAR_SS58_FORMAT = 5;

const AUTO_CONNECT_MS = 10_000; // [ms]
interface ChainProperty {
    tokenSymbols: string[];
    tokenDecimals: number[];
    chainName: string;
}

export class FaucetApi {
    private _started: boolean;
    private _mnemonic: string;
    private _faucetAccount: KeyringPair;
    private _provider: WsProvider;
    private _api: ApiPromise;
    private _keyring: Keyring;
    private _chainProperty: ChainProperty;

    private _requestTimeout: number;
    // a key-value pair of address and last request timestamp
    // note: because this is stored in memory, resetting the bot will reset the history too
    private _faucetLedger: { [key: string]: number } = {};
    private _faucetDripAmount: number;

    constructor(options: FaucetOption) {
        this._provider = new WsProvider(options.endpoint, AUTO_CONNECT_MS);
        this._keyring = new Keyring({ type: 'sr25519' });

        // note: the ledger is recorded in milliseconds
        this._requestTimeout = options.requestTimeout * 1000;
        this._faucetDripAmount = options.faucetDripAmount;

        console.log('connecting to ' + options.endpoint);
        this._api = new ApiPromise({
            provider: this._provider,
        });

        //this._keyring = new Keyring({ type: 'sr25519', ss58Format: ASTAR_SS58_FORMAT });
        // // create a random account if no mnemonic was provided
        // this._faucetAccount = this._keyring.addFromUri(options.mnemonic || mnemonicGenerate(), {
        //     name: 'Astar Faucet',
        // });
    }

    public get faucetAccount() {
        return this._faucetAccount;
    }

    public get api() {
        return this._api;
    }

    public get chainProperty() {
        return this._chainProperty;
    }

    public get faucetAmountFormatted() {
        const formattedAmount = this.formatBalance(
            helpers.tokenToMinimalDenom(this._faucetDripAmount, this._chainProperty.tokenDecimals[0]).toString(),
        );
        return formattedAmount;
    }
    public get faucetAmountNum() {
        return this._faucetDripAmount;
    }

    public async start() {
        if (this._started) {
            return this;
        }

        this._api = await this._api.isReady;

        const chainProperties = await this._api.rpc.system.properties();

        const ss58Format = chainProperties.ss58Format.unwrapOrDefault().toNumber();

        const tokenDecimals = chainProperties.tokenDecimals
            .unwrapOrDefault()
            .toArray()
            .map((i) => i.toNumber());

        const tokenSymbols = chainProperties.tokenSymbol
            .unwrapOrDefault()
            .toArray()
            .map((i) => i.toString());

        const chainName = (await this._api.rpc.system.chain()).toString();

        console.log(`connected to ${chainName} with account ${this.faucetAccount.address}`);

        this._chainProperty = {
            tokenSymbols,
            tokenDecimals,
            chainName,
        };
        this._keyring.setSS58Format(ss58Format);
        this._started = true;

        // create a random account if no mnemonic was provided
        this._faucetAccount = this._keyring.addFromUri(this._mnemonic || mnemonicGenerate(), {
            name: 'Astar Faucet',
        });

        return this;
    }

    public async getBlockHash(blockNumber: number) {
        return await this._api?.rpc.chain.getBlockHash(blockNumber);
    }

    public transfer(dest: string, balance: BN): SubmittableExtrinsic<ApiTypes> {
        const ext = this._api?.tx.balances.transferKeepAlive(dest, balance);
        if (ext) return ext;
        throw new Error('Undefined transfer');
    }

    public buildTxCall(extrinsic: string, method: string, ...args: any[]): ExtrinsicPayload {
        const ext = this._api?.tx[extrinsic][method](...args);
        if (ext) return ext;
        throw new Error(`Undefined extrinsic call ${extrinsic} with method ${method}`);
    }

    public buildStorageQuery(extrinsic: string, method: string, ...args: any[]) {
        const ext = this._api?.query[extrinsic][method](...args);
        if (ext) return ext;
        throw new Error(`Undefined storage query ${extrinsic} for method ${method}`);
    }

    public async nonce(): Promise<number | undefined> {
        return ((await this._api?.query.system.account(this.faucetAccount.address)) as any)?.nonce.toNumber();
    }

    public wrapBatchAll(txs: ExtrinsicPayload[]): ExtrinsicPayload {
        const ext = this._api?.tx.utility.batchAll(txs);
        if (ext) return ext;
        throw new Error('Undefined batch all');
    }

    public async getBalance() {
        const addr = this._faucetAccount.address;

        const balance = await this.api.query.system.account(addr);
        const { data } = balance;

        return this.formatBalance(data.free.toBn().toString());
    }

    public formatBalance(input: string) {
        formatBalance.setDefaults({
            unit: this._chainProperty.tokenSymbols[0],
            decimals: this._chainProperty.tokenDecimals[0],
        });
        return formatBalance(input, {
            withSi: true,
            withUnit: true,
        });
    }

    public async signAndSend(tx: ExtrinsicPayload, options?: Partial<SignerOptions>) {
        // ensure that we automatically increment the nonce per transaction
        return await tx.signAndSend(this.faucetAccount, { nonce: -1, ...options });
    }

    public faucetRequestTime(address: string) {
        const lastRequestAt = this._faucetLedger[address] || 0;
        return { lastRequestAt, nextRequestAt: lastRequestAt > 0 ? lastRequestAt + this._requestTimeout : 0 };
    }

    public async drip(dest: string) {
        let address = dest;

        if (!address) {
            throw new Error('No address was given');
        }

        // convert H160 address to SS58
        if (isEthereumAddress(dest)) {
            address = evmToAddress(dest);
        }
        // check if it is a valid address
        if (!isAddress(address) || !checkAddress(address, ASTAR_SS58_FORMAT)) {
            throw new Error(`${dest} is not a valid address!`);
        }
        // check if the account is not spamming
        const canRequest = await this._canRequest(address);
        if (!canRequest) {
            const nextClaim = new Date(this._faucetLedger[address] + this._requestTimeout);
            throw new Error(`Address ${dest} can request after ${nextClaim.toISOString()}`);
        }

        // a hacky ad-hoc check to allow testnet requests to be made regardless of the user's current balance
        if (!this._chainProperty.chainName.toLocaleLowerCase().includes('test')) {
            // check the request account's balance
            const accountBalance = (await this._api.query.system.account(address)).data.free.toBn();

            // the maximum amount of tokens to be able to receive the drip
            const requestBuffer = helpers
                .tokenToMinimalDenom(this._faucetDripAmount, this._chainProperty.tokenDecimals[0])
                .divn(2);

            // only accounts with less than half of the drip amount can receive the faucet drip
            const hasLowBalance = requestBuffer.gte(accountBalance);

            if (!hasLowBalance) {
                throw new Error(
                    `Address ${dest} already has ${this.formatBalance(
                        accountBalance.toString(),
                    )}. Cannot request more.`,
                );
            }
        }

        const transferAmount = helpers.tokenToMinimalDenom(
            this._faucetDripAmount,
            this._chainProperty.tokenDecimals[0],
        );
        const dripTx = this.transfer(address, transferAmount);
        const network = this.chainProperty.chainName.toLowerCase();
        const tip = await fetchTip({ network, speed: 'average' });
        const hash = (await this.signAndSend(dripTx, { tip })).toString();

        this._faucetLedger[address] = Date.now();
        return hash;
    }

    /**
     * Check if the given address can receive a drip or not.
     * An account can receive a drip if they haven't requested for a certain amount of time,
     * and they have a balance under certain amount.
     * @param address The recipient address in SS58
     * @returns can request if true
     */
    private async _canRequest(address: string) {
        //const lastRequest = this._faucetLedger[address] || null;
        if (!isAddress(address)) {
            throw new Error(`${address} is not a correct SS58 address`);
        }

        const overTimeout =
            !(address in this._faucetLedger) || this._faucetLedger[address] + this._requestTimeout < Date.now();

        // true if there was no last request, or the last request is over the timeout
        return overTimeout;
    }
}
