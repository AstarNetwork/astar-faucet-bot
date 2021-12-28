import axios from 'axios';

export const postMessage = async ({ text, channelId }: { text: string; channelId: string }): Promise<void> => {
    await axios
        .post(`https://hooks.slack.com/services/${channelId}`, {
            text,
        })
        .catch((e) => console.error(e.message));
};
