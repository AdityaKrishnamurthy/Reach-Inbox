import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';

export const getRedisOptions = (): RedisOptions => {
  return {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  };
};

export const createRedisConnection = (customOptions?: RedisOptions): Redis => {
  const options: RedisOptions = {
    ...getRedisOptions(),
    ...customOptions,
  };

  return new Redis(config.redisUrl, options);
};

// Singleton Redis client for app caching / rate limiting
export const redis = createRedisConnection();

redis.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

redis.on('connect', () => {
  if (config.nodeEnv !== 'test') {
    console.log('[Redis] Connected successfully.');
  }
});
