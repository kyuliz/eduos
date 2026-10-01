import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export async function rateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<{ success: boolean; current: number }> {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return { success: current <= limit, current };
}
