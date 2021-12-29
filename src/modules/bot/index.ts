import axios from 'axios';

export const postDiscordMessage = async ({ text, endpoint }: { text: string; endpoint: string }): Promise<void> => {
    await axios
        .post(endpoint, {
            username: 'Astar Faucet',
            avatar_url: '',
            content: text,
        })
        .catch((e) => console.error(e.message));
};
