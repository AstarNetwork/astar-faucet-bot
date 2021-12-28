# Discord Bot Starter Project

## Usage

### Configuration

To start the bot server, you must provide the application credentials environmental variables.
You can do this by creating a `.env` file with the following variables.

```env
# Bot user app token
DISCORD_APP_TOKEN=<bot token>

# Bot user client ID
DISCORD_APP_CLIENT_ID=<app id>

# Server ID for the bot to be installed
DISCORD_GUILD_ID=<guild id>

# The channel ID for the bot to listen to
DISCORD_FAUCET_CHANNEL_ID=<channel id>

# Secret phrase (mnemonic) for the faucet account
FAUCET_SECRET_PHRASE=<secret phrase>

# Faucet send amount
TESTNET_FAUCET_AMOUNT = '15'
MAINNET_FAUCET_AMOUNT = '0.002'

# Redis URL in URL format
# In Heroku, this is automatically set when you add the Redis add-on to your app.
REDIS_URL=<redis://[:password@]host[:port][/db-number][?option=value]>

# Slack incoming webhooks
# Ref: https://api.slack.com/messaging/webhooks
SLACK_WEBHOOKS = '1234/ABCD/EFG'

# Discord webhooks
# Ref: https://www.labnol.org/code/20563-post-message-to-discord-webhooks
DISCORD_WEBHOOKS = '12345/ABCDEFG'
# Ref: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
DISCORD_MENTION_ID = '@123456789'
```

### Scripts

```bash
# install all the dependencies
yarn

# starts the server app in node.js environment
yarn start
# or you can use `yarn serve`

# starts a development server with ts-node
yarn dev

# transpile the project for production
yarn build
```
