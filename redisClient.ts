import { createClient } from 'redis';

// Always use local Redis
const redisUrl = 'redis://localhost:6379';

export const redisClient = createClient({
    url: redisUrl,
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

export async function connectRedis(): Promise<void> {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log(`Connected to local Redis at ${redisUrl}`);
    }
}