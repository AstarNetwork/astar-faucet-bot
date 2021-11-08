import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const anHourInMilliSecond = 60 * 60 * 1000;

// Check whether the requester can request Faucet or not based on the last request time.
export const canRequestFaucet = async (requesterId: string, now: number): Promise<void> => {
    const lastRequestAt = Number(await redis.get(requesterId));
    const untilNextRequest = lastRequestAt + anHourInMilliSecond - now;

    if (untilNextRequest > 0)  {
        const untilNextRequestMin = Math.floor(untilNextRequest / 1000 / 60);
        const untilNextRequestSec = Math.floor( (untilNextRequest / 1000) - (untilNextRequestMin * 60) );
        const replyMessage = `You already requested the Faucet. Try again in ${untilNextRequestMin} mins ${untilNextRequestSec} secs.`;
        throw new Error(replyMessage);
    }
};

// Log the Faucet request on Redis
export const logRequest = async (requesterId: string, now: number): Promise<void> => {
    await redis.set(requesterId, now, "PX", anHourInMilliSecond);   
}