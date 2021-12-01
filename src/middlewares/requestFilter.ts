import Redis from 'ioredis';
import { DateTime } from 'luxon';
const redis = new Redis(process.env.REDIS_URL);

// Cooldown time in millisecond.
// The requester must wait for Cooldown time to request next faucet.
const nativeCooldownTimeMillisecond = 60 * 60 * 1000;
const evmCooldownTimeMillisecond = 60 * 60 * 48 * 1000;

// Check whether the requester can request Faucet or not based on the last request time.
export const canRequestFaucet = async (requesterId: string, now: number, isEvm?: boolean): Promise<void> => {
    const lastRequestAt = Number(await redis.get(requesterId));
    const elapsedTimeFromLastRequest = now - lastRequestAt;
    const cooldownTimeMillisecond = isEvm ? evmCooldownTimeMillisecond : nativeCooldownTimeMillisecond;

    // If lastReuqest was made within the cooldown time, the requester cannot request.
    if (cooldownTimeMillisecond > elapsedTimeFromLastRequest) {
        const resetTime = DateTime.fromMillis(lastRequestAt + cooldownTimeMillisecond);
        const { hours, minutes, seconds } = resetTime.diffNow(['hours', 'minutes', 'seconds']);

        let replyMessage;
        if (isEvm) {
            console.log('evm?');
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
export const logRequest = async (requesterId: string, now: number, isEvm?: boolean): Promise<void> => {
    const cooldownTimeMillisecond = isEvm ? evmCooldownTimeMillisecond : nativeCooldownTimeMillisecond;
    await redis.set(requesterId, now, 'PX', cooldownTimeMillisecond);
};

export const getRemainTime = async ({
    requesterId,
    isEvm,
}: {
    requesterId: string;
    isEvm?: boolean;
}): Promise<{ hours: number; minutes: number; seconds: number }> => {
    const cooldownTimeMillisecond = isEvm ? evmCooldownTimeMillisecond : nativeCooldownTimeMillisecond;
    const lastRequestAt = Number(await redis.get(requesterId));

    if (lastRequestAt) {
        const resetTime = DateTime.fromMillis(lastRequestAt + cooldownTimeMillisecond);
        const { hours, minutes, seconds } = resetTime.diffNow(['hours', 'minutes', 'seconds']);
        return { hours, minutes, seconds };
    }
    return { hours: 0, minutes: 0, seconds: 0 };
};
