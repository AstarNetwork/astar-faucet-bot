import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import type { ISubmittableResult } from '@polkadot/types/types';
import { appConfig } from '../config';
import { formatBalance } from '@polkadot/util';
import { evmToAddress } from '@polkadot/util-crypto';
import type { KeyringPair } from '@polkadot/keyring/types';
import BN from 'bn.js';
import { checkAddressType } from '../helpers';

export type NetworkName = 'dusty' | 'shibuya';
export interface FaucetOption {
    faucetAccountSeed: string;
    dripAmount: BN;
}

// ss58 address prefix
export const ASTAR_SS58_FORMAT = 5;

export const ASTAR_TOKEN_DECIMALS = 18;

export class AstarFaucetApi {
    private _keyring: Keyring;
    private _faucetAccount: KeyringPair;
    private _api: ApiPromise;
    // token amount to send from the faucet per request
    private _dripAmount: BN;

    public get faucetAccount() {
        return this._faucetAccount;
    }

    public get api() {
        return this._api;
    }

    constructor(options: FaucetOption) {
        this._keyring = new Keyring({ type: 'sr25519', ss58Format: ASTAR_SS58_FORMAT });
        this._faucetAccount = this._keyring.addFromUri(options.faucetAccountSeed, { name: 'Astar Faucet' });
        this._dripAmount = options.dripAmount;
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
    public async sendTokenTo(to: string) {
        // send 30 testnet tokens per call
        //const faucetAmount = new BN(30).mul(new BN(10).pow(new BN(18)));

        let destinationAccount = to;
        const addrType = checkAddressType(to);

        // convert the h160 (evm) account to ss58 before sending the tokens
        if (addrType === 'H160') {
            destinationAccount = evmToAddress(to, ASTAR_SS58_FORMAT);
        }

        return await this._api.tx.balances
            .transfer(destinationAccount, this._dripAmount)
            .signAndSend(this._faucetAccount);
    }
}
