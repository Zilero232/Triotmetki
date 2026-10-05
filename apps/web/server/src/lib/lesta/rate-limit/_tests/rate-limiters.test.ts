import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RateLimiter } from '../rate-limit.types';

import { LestaQueueFullError } from '../../errors/lesta-api-error';
import { RATE_LIMIT } from '../rate-limit.constants';
import { createRedisRateLimiter } from '../rate-limiters';

const REQUESTS_PER_SECOND = 2;

const WINDOW_MS = RATE_LIMIT.windowSeconds * 1000;

const SHARED_KEY = 'shared';

const track = (promise: Promise<void>) => {
  const state = { settled: false };

  void promise.then(() => {
    state.settled = true;
  });

  return state;
};

const exhaustBudget = async (limiters: readonly RateLimiter[]) => {
  for (let index = 0; index < REQUESTS_PER_SECOND; index += 1) {
    await limiters[index % limiters.length].acquire();
  }
};

const expectQueuedUntilWindowEnds = async (limiter: RateLimiter) => {
  const overflow = track(limiter.acquire());

  await vi.advanceTimersByTimeAsync(WINDOW_MS - 1);

  expect(overflow.settled).toBe(false);

  await vi.advanceTimersByTimeAsync(1);

  expect(overflow.settled).toBe(true);
};

describe('createRedisRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one budget between clients on the same key', async () => {
    const redis = new RedisMock();
    const instanceA = createRedisRateLimiter({ redis, key: SHARED_KEY, requestsPerSecond: REQUESTS_PER_SECOND });
    const instanceB = createRedisRateLimiter({ redis, key: SHARED_KEY, requestsPerSecond: REQUESTS_PER_SECOND });

    await exhaustBudget([instanceA, instanceB]);

    await expectQueuedUntilWindowEnds(instanceA);
  });

  it('keeps separate budgets for different keys', async () => {
    const redis = new RedisMock();
    const instanceA = createRedisRateLimiter({ redis, key: SHARED_KEY, requestsPerSecond: REQUESTS_PER_SECOND });
    const other = createRedisRateLimiter({ redis, key: 'other', requestsPerSecond: REQUESTS_PER_SECOND });

    await exhaustBudget([instanceA]);

    const granted = track(other.acquire());

    await vi.advanceTimersByTimeAsync(0);

    expect(granted.settled).toBe(true);
  });
});

describe('createRedisRateLimiter overflow', () => {
  it('rejects a request beyond the local queue with a retryable Lesta error', async () => {
    const redis = new RedisMock();
    const limiter = createRedisRateLimiter({ redis, key: 'overflow', requestsPerSecond: 1, maxQueueSize: 1 });

    await limiter.acquire();

    const waiting = limiter.acquire();

    await expect(limiter.acquire()).rejects.toBeInstanceOf(LestaQueueFullError);

    await waiting;
  });
});
