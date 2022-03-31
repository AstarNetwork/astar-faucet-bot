import cors from 'cors';
import express from 'express';
import { appOauthInstallUrl } from './discord';
import { NetworkApis, Network, FaucetInfo } from '../types';

const whitelist = ['http://localhost:8080', 'http://localhost:8081', 'https://portal.astar.network'];

/**
 * Handles client request via Express.js. These are usually for custom endpoints or OAuth and app installation.
 * We didn't hook this up to any database, so for out-of-the-box usage, you can hard-code the guild ID and other credentials in a .env file
 */
export const expressApp = async (apis: NetworkApis) => {
    const app = express();
    app.use(express.json());
    app.use(cors());

    const port = process.env.PORT || 8080;
    /*
    const installUrl = appOauthInstallUrl();

    // show application install link for Discord
    app.get('/install', (_req, res) => {
        // redirect to app install page
        return res.redirect(installUrl);

        // send the install link as a JSON response
        //return res.status(200).json({ url: installUrl });
    });

    // for testing
    app.get('/oauth2', async ({ query }, _res) => {
        const { code } = query;
        console.log(code);
    });
    */

    const { astarApi, shidenApi, shibuyaApi } = apis;

    app.post('/:network/drip', async (req, res) => {
        try {
            // todo: refactor to make this generic instead of hard coding
            const origin = String(req.headers.origin);
            const listedOrigin = whitelist.find((it) => it === origin);

            // for portal staging environments
            const isHeroku = origin.includes('https://deploy-preview-pr-');

            if (!listedOrigin && !isHeroku) {
                throw Error('invalid request');
            }
            // parse the name of the network
            const network: Network = req.params.network as Network;
            // parse the faucet drip destination
            const address: string = req.body.destination as string;
            // todo: refactor this to implement the command pattern
            let hash = '';
            // i know this is not a clean solution :(
            switch (network) {
                case Network.astar:
                    hash = await astarApi.drip(address);
                    break;
                case Network.shiden:
                    hash = await shidenApi.drip(address);
                    break;
                default:
                    hash = await shibuyaApi.drip(address);
                    break;
            }

            return res.status(200).json({ hash });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            res.status(500).json({ code: 500, error: e.message || 'Something went wrong' });
        }
    });

    app.get('/:network/drip', async (req, res) => {
        try {
            const network: Network = req.params.network as Network;
            const address: string = req.query.destination as string;

            let balance = '';
            let faucetInfo: FaucetInfo;
            // i know this is not a clean solution :(
            switch (network) {
                case Network.astar:
                    //const { timestamps, faucet } = await getFaucetInfo({ network, address });
                    balance = await astarApi.getBalance();
                    faucetInfo = {
                        timestamps: astarApi.faucetRequestTime(address),
                        faucet: {
                            unit: astarApi.chainProperty.tokenSymbols[0],
                            amount: astarApi.faucetAmountNum,
                        },
                    };
                    break;

                case Network.shiden:
                    //const { timestamps, faucet } = await getFaucetInfo({ network, address });
                    balance = await shidenApi.getBalance();
                    faucetInfo = {
                        timestamps: shidenApi.faucetRequestTime(address),
                        faucet: {
                            unit: shidenApi.chainProperty.tokenSymbols[0],
                            amount: shidenApi.faucetAmountNum,
                        },
                    };
                    break;
                default:
                    //const { timestamps, faucet } = await getFaucetInfo({ network, address });
                    balance = await shibuyaApi.getBalance();
                    faucetInfo = {
                        timestamps: shibuyaApi.faucetRequestTime(address),
                        faucet: {
                            unit: shibuyaApi.chainProperty.tokenSymbols[0],
                            amount: shibuyaApi.faucetAmountNum,
                        },
                    };
                    break;
            }

            return res.status(200).json({ timestamps: faucetInfo.timestamps, faucet: faucetInfo.faucet });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            res.status(500).json({ code: 500, error: e.message || 'something goes wrong' });
        }
    });

    app.listen(port, () => console.log(`App listening at port ${port}`));
    return app;
};
