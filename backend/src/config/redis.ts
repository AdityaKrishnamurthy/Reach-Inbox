// Redis connection factory used both by the app's own caching/rate-limiting
// code and, via createRedisConnection, by BullMQ producers/workers. Disables
// the ready-check and per-request retry cap since BullMQ requires those
// settings to manage its own connection lifecycle.

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
