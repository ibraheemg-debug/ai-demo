import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  // maxRetriesPerRequest: null would hang commands indefinitely when Redis
  // is unavailable. Set to 0 so each command fails immediately with an error
  // (the connection itself will keep retrying in the background via retryStrategy).
  maxRetriesPerRequest: 0,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    // Log at most every 10 attempts to avoid log spam
    if (times <= 5 || times % 10 === 0) {
      console.warn(`[redis] Reconnecting in ${delay}ms (attempt ${times})`);
    }
    return delay;
  },
});

redis.on('connect', () => console.log('[redis] Connected'));
redis.on('error', (err) => console.error('[redis] Error:', err.message));
