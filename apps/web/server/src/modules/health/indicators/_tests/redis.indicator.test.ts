import type { Redis } from 'ioredis';

import { HealthIndicatorService } from '@nestjs/terminus';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { HEALTH } from '../../config/health.constants';
import { RedisIndicator } from '../redis.indicator';

const createIndicator = () => {
  const redis = mock<Redis>();

  return { redis, indicator: new RedisIndicator(redis, new HealthIndicatorService()) };
};

describe('RedisIndicator.ping', () => {
  it('is up when Redis answers the ping', async () => {
    const { redis, indicator } = createIndicator();

    redis.ping.mockResolvedValue('PONG');

    expect((await indicator.ping())[HEALTH.key.redis]).toEqual({ status: 'up' });
  });

  it('is down with the connection error when Redis does not answer', async () => {
    const { redis, indicator } = createIndicator();

    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    expect((await indicator.ping())[HEALTH.key.redis]).toMatchObject({ status: 'down', message: expect.stringContaining('ECONNREFUSED') });
  });
});
