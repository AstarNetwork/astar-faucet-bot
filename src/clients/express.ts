import cors from 'cors';
import express from 'express';
import { AstarFaucetApi, Network } from '.';
import { getFaucetInfo, sendFaucet } from '../modules/faucet';
import { appOauthInstallUrl } from './discord';

const whitelist = [
    'http://localhost:8080',
    'http://localhost:8081',
    'https://portal.astar.network',
    'https://deploy-preview-pr-',
];

/**
 * Handles client request via Express.js. These are usually for custom endpoints or OAuth and app installation.
 * We didn't hook this up to any database, so for out-of-the-box usage, you can hard-code the guild ID and other credentials in a .env file
 */
export const expressApp = async (astarApi: AstarFaucetApi) => {
    const app = express();
    app.use(express.json());
    app.use(cors());

    const port = process.env.PORT || 8080;
    const installUrl = appOauthInstallUrl();

    // show application install link
    app.get('/install', (_req, res) => {
        // redirect to app install page
        return res.redirect(installUrl);

        // send the install link as a JSON response
        //return res.status(200).json({ url: installUrl });
    });

    app.get('/oauth2', async ({ query }, res) => {
        const { code } = query;
        console.log(code);
    });

    app.post('/:network/drip', async (req, res) => {
        try {
            if (!whitelist.includes(String(req.headers.origin))) {
                throw Error('invalid request');
            }
            const network: Network = req.params.network as Network;
            const address: string = req.body.destination as string;
            const hash = await sendFaucet({ address, network, astarApi });
            return res.status(200).json({ hash });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            res.status(500).json(e.message || 'something goes wrong');
        }
    });

    app.get('/:network/drip', async (req, res) => {
        try {
            const network: Network = req.params.network as Network;
            const address: string = req.query.destination as string;
            const { timestamps, faucet } = await getFaucetInfo({ network, address });
            return res.status(200).json({ timestamps, faucet });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            res.status(500).json(e.message || 'something goes wrong');
        }
    });

    app.listen(port, () => console.log(`App listening at port ${port}`));
    return app;
};
