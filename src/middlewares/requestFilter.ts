import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cooldown time in millisecond.
// The requester must wait for Cooldown time to request next faucet.
const cooldownTimeMillisecond = 60 * 60 * 1000;

// Check whether the requester can request Faucet or not based on the last request time.
export const canRequestFaucet = async (requesterId: string, now: number): Promise<void> => {
    const lastRequestAt = Number(await redis.get(requesterId));
    const elapsedTimeFromLastRequest = now - lastRequestAt;
    
    // If lastReuqest was made within the cooldown time, the requester cannot request.
    if (cooldownTimeMillisecond > elapsedTimeFromLastRequest) {
        const untilNextRequestMillisec = cooldownTimeMillisecond - elapsedTimeFromLastRequest;
        const untilNextRequestMin      = Math.floor(untilNextRequestMillisec / 1000 / 60);
        const untilNextRequestSec      = Math.floor( (untilNextRequestMillisec / 1000) - (untilNextRequestMin * 60) );

        const replyMessage = `You already requested the Faucet. Try again in ${untilNextRequestMin} mins ${untilNextRequestSec} secs.`;
        throw new Error(replyMessage);
    }
};

// Log the Faucet request on Redis
export const logRequest = async (requesterId: string, now: number): Promise<void> => {
    await redis.set(requesterId, now, "PX", cooldownTimeMillisecond);   
}