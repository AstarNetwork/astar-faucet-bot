import axios from 'axios';

export const postDiscordMessage = async ({ text, channelId }: { text: string; channelId: string }): Promise<void> => {
    const url = `https://discord.com/api/webhooks/${channelId}`;
    await axios
        .post(url, {
            username: 'Bot',
            avatar_url: '',
            content: text,
        })
        .catch((e) => console.error(e.message));
};

export const postSlackMessage = async ({ text, channelId }: { text: string; channelId: string }): Promise<void> => {
    await axios
        .post(`https://hooks.slack.com/services/${channelId}`, {
            text,
        })
        .catch((e) => console.error(e.message));
};
