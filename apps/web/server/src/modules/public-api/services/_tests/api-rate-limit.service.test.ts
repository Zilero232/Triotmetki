import { API_TIER_LIMITS } from '@otmetki/schemas';
import { millisecondsInSecond } from 'date-fns/constants';
import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTooManyRequestsException } from '../../../../common/exceptions';
import { API_RATE_LIMIT } from '../../config/public-api.constants';
import { ApiRateLimitService } from '../api-rate-limit.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const owner = (userId: string) => ({ userId, tier: 'free' as const });

const retryAfter = (error: unknown) => (error instanceof AppTooManyRequestsException ? error.retryAfterSec : null);

describe('ApiRateLimitService.consume', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets a tier use its requests per second and throttles the next one', async () => {
    const service = new ApiRateLimitService(new RedisMock());
    const { requestsPerSecond } = API_TIER_LIMITS.free;

    for (let request = 0; request < requestsPerSecond; request += 1) {
      await service.consume(owner('rps'));
    }

    const error = await service.consume(owner('rps')).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppTooManyRequestsException);
    expect(error).toMatchObject({ response: { code: 'RATE_LIMITED' } });
    expect(retryAfter(error)).toBe(API_RATE_LIMIT.secondWindow);
  });

  it('throttles a user whose per-second bucket is already full and lets them through once the window passes', async () => {
    const redis = new RedisMock();
    const service = new ApiRateLimitService(redis);

    await redis.set(`${API_RATE_LIMIT.secondPrefix}:full`, API_TIER_LIMITS.free.requestsPerSecond, 'EX', API_RATE_LIMIT.secondWindow);

    await expect(service.consume(owner('full'))).rejects.toMatchObject({ response: { code: 'RATE_LIMITED' } });

    vi.setSystemTime(NOW.getTime() + API_RATE_LIMIT.secondWindow * millisecondsInSecond);

    await expect(service.consume(owner('full'))).resolves.toMatchObject({ second: { remaining: API_TIER_LIMITS.free.requestsPerSecond - 1 } });
  });

  it('lets the request through with the full budget when the store is unavailable', async () => {
    const redis = new RedisMock();
    const service = new ApiRateLimitService(redis);

    vi.spyOn(redis, 'defineCommand').mockImplementation((name) => {
      Object.defineProperty(redis, name, { value: async () => Promise.reject(new Error('store down')) });
    });

    await expect(service.consume(owner('offline'))).resolves.toEqual({
      second: { limit: API_TIER_LIMITS.free.requestsPerSecond, remaining: API_TIER_LIMITS.free.requestsPerSecond },
      day: { limit: API_TIER_LIMITS.free.requestsPerDay, remaining: API_TIER_LIMITS.free.requestsPerDay }
    });
  });

  it('reports what is left of the per-second and the daily budget', async () => {
    const service = new ApiRateLimitService(new RedisMock());

    await expect(service.consume(owner('budget'))).resolves.toEqual({
      second: { limit: API_TIER_LIMITS.free.requestsPerSecond, remaining: API_TIER_LIMITS.free.requestsPerSecond - 1 },
      day: { limit: API_TIER_LIMITS.free.requestsPerDay, remaining: API_TIER_LIMITS.free.requestsPerDay - 1 }
    });
  });

  it('counts every user on its own', async () => {
    const service = new ApiRateLimitService(new RedisMock());

    for (let request = 0; request < API_TIER_LIMITS.free.requestsPerSecond; request += 1) {
      await service.consume(owner('busy'));
    }

    await expect(service.consume(owner('quiet'))).resolves.toMatchObject({ second: { remaining: API_TIER_LIMITS.free.requestsPerSecond - 1 } });
  });

  it('stops a user whose keys together used up the daily quota', async () => {
    const redis = new RedisMock();
    const service = new ApiRateLimitService(redis);

    await redis.set(`${API_RATE_LIMIT.dayPrefix}:heavy`, API_TIER_LIMITS.free.requestsPerDay, 'EX', API_RATE_LIMIT.dayWindow);

    const error = await service.consume(owner('heavy')).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ response: { code: 'PLAN_LIMIT_REACHED' } });
    expect(retryAfter(error)).toBe(API_RATE_LIMIT.dayWindow);
  });
});
