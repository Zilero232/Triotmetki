import { RateLimiterQueue, RateLimiterQueueError, RateLimiterRedis } from 'rate-limiter-flexible';

import type { QueueRateLimiterInput, RateLimiter, RedisRateLimiterInput } from './rate-limit.types';

import { LestaQueueFullError } from '../errors/lesta-api-error';
import { RATE_LIMIT } from './rate-limit.constants';

const fromQueue = ({ queue, key }: QueueRateLimiterInput): RateLimiter => ({
  acquire: async () => {
    try {
      await queue.removeTokens(1, key);
    } catch (error) {
      throw error instanceof RateLimiterQueueError ? new LestaQueueFullError({ key, cause: error }) : error;
    }
  }
});

export const createRedisRateLimiter = ({
  redis,
  requestsPerSecond,
  key = RATE_LIMIT.redisKey,
  keyPrefix = RATE_LIMIT.redisKeyPrefix,
  maxQueueSize
}: RedisRateLimiterInput): RateLimiter => {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points: requestsPerSecond,
    duration: RATE_LIMIT.windowSeconds
  });

  return fromQueue({ queue: new RateLimiterQueue(limiter, { maxQueueSize }), key });
};

export const noopRateLimiter: RateLimiter = {
  acquire: async () => {}
};
