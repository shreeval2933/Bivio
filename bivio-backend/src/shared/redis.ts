import Redis from 'ioredis';
import { env } from '../config/env';

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Retry with delay, maxing out at 5 seconds between retries
    return Math.min(times * 200, 5000);
  },
});

redis.on('error', (err) => {
  // Handle the error event to prevent unhandled error event console spamming
  console.error('Redis connection warning:', err.message);
});

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
