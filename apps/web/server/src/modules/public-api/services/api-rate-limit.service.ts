import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_TIER_LIMITS } from '@otmetki/schemas';
import { millisecondsInSecond } from 'date-fns/constants';
import { Redis } from 'ioredis';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

import type { BudgetOwner, LimiterInput, SecondBudget, TakeBudgetInput, UserBudget } from '../public-api.types';

import { AppTooManyRequestsException } from '../../../common/exceptions';
import { errorMessage } from '../../../common/lib';
import { REDIS } from '../../../core';
import { API_RATE_LIMIT } from '../config';

@Injectable()
export class ApiRateLimitService {
  private readonly logger = new Logger(ApiRateLimitService.name);
  private readonly limiters = new Map<string, RateLimiterRedis>();
  private readonly failedKeys: RateLimiterRedis;

  constructor(@Inject(REDIS) private readonly redis: Redis) {
    this.failedKeys = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: API_RATE_LIMIT.failedKeys.prefix,
      points: API_RATE_LIMIT.failedKeys.points,
      duration: API_RATE_LIMIT.failedKeys.duration
    });
  }

  async assertKeyAttemptsLeft(ip: string): Promise<void> {
    const spent = await this.failedKeys.get(ip).catch((error: unknown) => {
      this.logger.warn(`failed-key limit store unavailable, letting the request through: ${errorMessage(error)}`);

      return null;
    });

    if (spent && spent.consumedPoints >= API_RATE_LIMIT.failedKeys.points) {
      throw new AppTooManyRequestsException(
        'RATE_LIMITED',
        'Too many requests with an invalid API key from this address',
        Math.max(1, Math.ceil(spent.msBeforeNext / millisecondsInSecond))
      );
    }
  }

  async chargeFailedKey(ip: string): Promise<void> {
    await this.failedKeys.consume(ip).catch((error: unknown) => {
      if (!(error instanceof RateLimiterRes)) {
        this.logger.warn(`failed API key attempt not counted: ${errorMessage(error)}`);
      }
    });
  }

  async consume(owner: BudgetOwner): Promise<UserBudget> {
    const { requestsPerSecond, requestsPerDay } = API_TIER_LIMITS[owner.tier];

    const second = await this.take({
      owner,
      window: 'second',
      limit: requestsPerSecond,
      reject: (retryAfterSec) =>
        new AppTooManyRequestsException('RATE_LIMITED', `Up to ${requestsPerSecond} requests per second on the ${owner.tier} tier`, retryAfterSec)
    });

    const day = await this.take({
      owner,
      window: 'day',
      limit: requestsPerDay,
      reject: (retryAfterSec) =>
        new AppTooManyRequestsException(
          'PLAN_LIMIT_REACHED',
          `Up to ${requestsPerDay} requests a day across all keys on the ${owner.tier} tier`,
          retryAfterSec
        )
    });

    return { second, day };
  }

  private async take({ owner, window, limit, reject }: TakeBudgetInput): Promise<SecondBudget> {
    try {
      const { remainingPoints } = await this.limiter({ tier: owner.tier, window }).consume(owner.userId);

      return { limit, remaining: remainingPoints };
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        throw reject(Math.max(1, Math.ceil(error.msBeforeNext / millisecondsInSecond)));
      }

      this.logger.warn(`rate limit store unavailable, letting the request through: ${errorMessage(error)}`);

      return { limit, remaining: limit };
    }
  }

  private limiter({ tier, window }: LimiterInput): RateLimiterRedis {
    const id = `${window}:${tier}`;
    const existing = this.limiters.get(id);

    if (existing) {
      return existing;
    }

    const limiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: window === 'second' ? API_RATE_LIMIT.secondPrefix : API_RATE_LIMIT.dayPrefix,
      points: window === 'second' ? API_TIER_LIMITS[tier].requestsPerSecond : API_TIER_LIMITS[tier].requestsPerDay,
      duration: window === 'second' ? API_RATE_LIMIT.secondWindow : API_RATE_LIMIT.dayWindow
    });

    this.limiters.set(id, limiter);

    return limiter;
  }
}
