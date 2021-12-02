import { getRemainTime } from './../middlewares/requestFilter';
import { evmFaucet, Network, generateFaucetId, getFaucetAmount, checkAddressFormat } from '../modules/faucet';
import express from 'express';
import { logger } from '../modules/logger';
import { appOauthInstallUrl } from './discord';
import bodyParser from 'body-parser';

/**
 * Handles client request via Express.js. These are usually for custom endpoints or OAuth and app installation.
 * We didn't hook this up to any database, so for out-of-the-box usage, you can hard-code the guild ID and other credentials in a .env file
 */
export const expressApp = async () => {
    const app = express();
    app.use(bodyParser.json());

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
            console.log('req.body', req.body);
            const address: string = req.body.destination as string;
            const addressFormat = checkAddressFormat(address);
            // const { blockNumber, blockHash } = await evmFaucet({ network, address });
            // res.json({ blockNumber, blockHash });
            res.json({ addressFormat });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            logger.error(e);
            res.status(500).json(e.message || 'something goes wrong');
        }
    });

    app.get('/:network/drip/info', async (req, res) => {
        try {
            const network: Network = req.params.network as Network;
            const address: string = req.query.address as string;
            const requesterId = generateFaucetId({ network, address });
            const remainTime = await getRemainTime({ requesterId, isEvm: true });
            const faucet = getFaucetAmount(network);
            res.json({ remainTime, faucet });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            logger.error(e);
            res.status(500).json(e.message || 'something goes wrong');
        }
    });

    app.listen(port, () => console.log(`App listening at port ${port}`));
    return app;
};
