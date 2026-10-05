import type { INestApplication } from '@nestjs/common';

import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { API_KEY, API_TIER_LIMITS } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AppTooManyRequestsException, AppUnauthorizedException } from '../../../common/exceptions';
import { AllExceptionsFilter } from '../../../common/filters';
import { REDIS } from '../../../core';
import { ApiKeysService } from '../../developer';
import { LeaderboardService } from '../../leaderboards';
import { API_RATE_LIMIT } from '../config';
import { ApiKeyGuard } from '../guards';
import { ApiUsageInterceptor } from '../interceptors';
import { ApiRateLimitService, ApiUsageService } from '../services';
import { V1LeaderboardsController } from '../v1-leaderboards.controller';

const VALID_KEY = 'otm_valid';
const EXHAUSTED_KEY = 'otm_exhausted';
const QUOTA_RETRY_SEC = 3_600;
const NOW = new Date('2026-09-26T12:00:00Z');
const leaderboard = { scope: 'players', metric: 'wn8', period: '30d', total: 0, minBattles: 50, entries: [] };

const keys = mock<ApiKeysService>();
const usage = mock<ApiUsageService>();
const leaderboards = mock<LeaderboardService>();

keys.verify.mockImplementation(async (raw: string) => {
  if (raw === EXHAUSTED_KEY) {
    throw new AppTooManyRequestsException('PLAN_LIMIT_REACHED', 'The daily request quota of this key is used up', QUOTA_RETRY_SEC);
  }

  if (raw !== VALID_KEY) {
    throw new AppUnauthorizedException('API_KEY_INVALID', 'The API key is not valid');
  }

  return { id: 'key', userId: 'user', tier: 'free', dailyLimit: API_TIER_LIMITS.free.requestsPerDay, dailyRemaining: 7 };
});

leaderboards.leaderboard.mockResolvedValue({ ...leaderboard, scope: 'players', metric: 'wn8', period: '30d' });

describe('/v1 behind the API key guard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [V1LeaderboardsController],
      providers: [
        ApiKeyGuard,
        ApiUsageInterceptor,
        ApiRateLimitService,
        { provide: REDIS, useValue: new RedisMock() },
        { provide: ApiKeysService, useValue: keys },
        { provide: ApiUsageService, useValue: usage },
        { provide: LeaderboardService, useValue: leaderboards },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 without a key', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaderboards');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('API_KEY_INVALID');
    expect(leaderboards.leaderboard).not.toHaveBeenCalled();
  });

  it('answers 401 for an unknown key', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, 'otm_other');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('API_KEY_INVALID');
  });

  it('serves a valid key and reports the remaining budget', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, VALID_KEY);

    expect(response.status).toBe(200);
    expect(response.body.minBattles).toBe(leaderboard.minBattles);
    expect(Number(response.headers[API_RATE_LIMIT.headers.limit.toLowerCase()])).toBe(API_TIER_LIMITS.free.requestsPerSecond);
    expect(Number(response.headers[API_RATE_LIMIT.headers.dailyRemaining.toLowerCase()])).toBe(7);
    expect(usage.record).toHaveBeenCalledTimes(1);
    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({ keyId: 'key', endpoint: 'GET /v1/leaderboards', failed: false }));
  });

  it('serves the tier rate within one second and throttles the next request with 429 and Retry-After', async () => {
    const { requestsPerSecond } = API_TIER_LIMITS.free;
    const responses: request.Response[] = [];

    for (let attempt = 0; attempt <= requestsPerSecond; attempt += 1) {
      responses.push(await request(app.getHttpServer()).get('/v1/leaderboards?limit=5').set(API_KEY.header, VALID_KEY));
    }

    const throttled = responses.at(-1);

    expect(responses.map((response) => response.status)).toEqual([...Array.from({ length: requestsPerSecond }).fill(200), 429]);
    expect(throttled?.body.code).toBe('RATE_LIMITED');
    expect(Number(throttled?.headers['retry-after'])).toBe(API_RATE_LIMIT.secondWindow);
    expect(usage.record).toHaveBeenCalledTimes(requestsPerSecond);
    expect(usage.recordThrottled).toHaveBeenCalledTimes(1);
  });

  it('answers 429 with the time until the daily quota refills', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, EXHAUSTED_KEY);

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('PLAN_LIMIT_REACHED');
    expect(Number(response.headers['retry-after'])).toBe(QUOTA_RETRY_SEC);
  });

  it('refuses an address with 429 once it has spent its failed-key budget, without verifying the key', async () => {
    for (let attempt = 0; attempt < API_RATE_LIMIT.failedKeys.points; attempt += 1) {
      await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, 'otm_guess');
    }

    keys.verify.mockClear();

    const response = await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, VALID_KEY);

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMITED');
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(keys.verify).not.toHaveBeenCalled();
  });

  it('does not charge the failed-key budget for a valid key', async () => {
    for (let attempt = 0; attempt <= API_RATE_LIMIT.failedKeys.points; attempt += 1) {
      await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, VALID_KEY);
    }

    const response = await request(app.getHttpServer()).get('/v1/leaderboards').set(API_KEY.header, 'otm_guess');

    expect(response.status).toBe(401);
  });
});
