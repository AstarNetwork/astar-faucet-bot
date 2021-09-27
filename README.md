# Discord Bot Starter Project

## Usage

### Creating a Discord Application

To create an application that can be registered to a Discord server, you must create a Discord app via the [Discord Developer Portal](https://discord.com/developers/applications).
Once you created an app, you can access the client ID from the `General Information` setting and the bot token from the `Bot` setting (see image below).

![client-id](https://user-images.githubusercontent.com/40356749/134047191-8ea55a38-f398-4021-b8dc-9f5aedbf7463.png)

![bot-token](https://user-images.githubusercontent.com/40356749/134047251-93424ac3-bb8a-42a7-9dad-5a3855395abe.png)

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
# Secret phrase (nmonic) for the faucet account
FAUCET_SECRET_PHRASE=<secret phrase>
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

### Quick Start

After running `yarn dev`, open <http://localhost:8080/install> to install the application to your Discord server.

Go to a Discord channel that the bot has access to and type `/ping`.

![ping-command](https://user-images.githubusercontent.com/40356749/134050635-43de75ca-24ae-442c-8e9d-9aa75137e09f.png)

## Further Readings

For more information, please refer to the official Discord developer portal or the Discord.js documentation.

- <https://discord.com/developers/docs/intro>
- <https://discord.js.org/#/docs/main/stable/general/welcome>
- <https://discordjs.guide/#before-you-begin>
