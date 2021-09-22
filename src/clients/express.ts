import express from 'express';
import { appOauthInstallUrl } from './discord';

/**
 * Handles client request via Express.js. These are usually for custom endpoints or OAuth and app installation.
 * We didn't hook this up to any database, so for out-of-the-box usage, you can hard-code the guild ID and other credentials in a .env file
 */
export const expressApp = async () => {
    const app = express();

    const port = process.env.PORT || 8080;

    const installUrl = appOauthInstallUrl();

    // show application install link
    app.get('/install', (_req, res) => {
        // redirect to app install page
        return res.redirect(installUrl);

        // send the install link as a JSON response
        //return res.status(200).json({ url: installUrl });
    });

    // add endpoint for OAuth installation with redirect URLs (https://discord.com/developers/docs/topics/oauth2#authorization-code-grant)
    app.get('/oauth2', async ({ query }, res) => {
        const { code } = query;
        console.log(code);
    });

    app.listen(port, () => console.log(`App listening at port ${port}`));
    return app;
};
