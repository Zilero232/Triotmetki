import type { HealthIndicatorResult } from '@nestjs/terminus';

import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Redis } from 'ioredis';

import { errorMessage } from '../../../common/lib';
import { REDIS } from '../../../core';
import { HEALTH } from '../config/health.constants';

@Injectable()
export class RedisIndicator {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly indicators: HealthIndicatorService
  ) {}

  async ping(): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(HEALTH.key.redis);

    return this.redis.ping().then(
      () => indicator.up(),
      (error: unknown) => indicator.down({ message: errorMessage(error) })
    );
  }
}
