import Redis from 'ioredis';
import { DateTime } from 'luxon';
const redis = new Redis(process.env.REDIS_URL);

// Cooldown time in millisecond.
// The requester must wait for Cooldown time to request next faucet.
const testnetCooldownTimeMillisecond = 60 * 60 * 1000;
const mainnetCooldownTimeMillisecond = 60 * 60 * 48 * 1000;

// Check whether the requester can request Faucet or not based on the last request time.
export const canRequestFaucet = async (requesterId: string, now: number, isMainnet?: boolean): Promise<void> => {
    const lastRequestAt = Number(await redis.get(requesterId));
    const elapsedTimeFromLastRequest = now - lastRequestAt;
    const cooldownTimeMillisecond = isMainnet ? mainnetCooldownTimeMillisecond : testnetCooldownTimeMillisecond;

    // If lastReuqest was made within the cooldown time, the requester cannot request.
    if (cooldownTimeMillisecond > elapsedTimeFromLastRequest) {
        const resetTime = DateTime.fromMillis(lastRequestAt + cooldownTimeMillisecond);
        const { hours, minutes, seconds } = resetTime.diffNow(['hours', 'minutes', 'seconds']);

        let replyMessage;
        if (isMainnet) {
            replyMessage = `You already requested the Faucet. Try again in ${hours} hrs ${minutes} mins ${seconds.toFixed(
                0,
            )} secs.`;
        } else {
            replyMessage = `You already requested the Faucet. Try again in ${minutes} mins ${seconds.toFixed(0)} secs.`;
        }

        throw new Error(replyMessage);
    }
};

// Log the Faucet request on Redis
export const logRequest = async (requesterId: string, now: number, isMainnet?: boolean): Promise<void> => {
    const cooldownTimeMillisecond = isMainnet ? mainnetCooldownTimeMillisecond : testnetCooldownTimeMillisecond;
    await redis.set(requesterId, now, 'PX', cooldownTimeMillisecond);
};

export const getRequestTimestamps = async ({
    requesterId,
    isMainnet,
}: {
    requesterId: string;
    isMainnet: boolean;
}): Promise<{ lastRequestAt: number; nextRequestAt: number }> => {
    const cooldownTimeMillisecond = isMainnet ? mainnetCooldownTimeMillisecond : testnetCooldownTimeMillisecond;
    const lastRequestAt = Number(await redis.get(requesterId));
    const nextRequestAt = lastRequestAt + cooldownTimeMillisecond;
    return { lastRequestAt, nextRequestAt };
};
