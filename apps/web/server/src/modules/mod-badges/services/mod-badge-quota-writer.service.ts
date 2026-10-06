import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { ClaimBadgeQuotaInput } from '../mod-badges.types';

import { AppConfigService } from '../../../config';
import { REDIS } from '../../../core';
import { MOD_BADGES_QUOTA } from '../config/mod-badges.constants';
import { quotaKey, quotaMembers, secondsUntilNextDay } from '../lib/badge-quota/badge-quota';

@Injectable()
export class ModBadgeQuotaWriterService {
  constructor(
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async claim({ deviceId, accountIds, now }: ClaimBadgeQuotaInput): Promise<number | null> {
    const members = quotaMembers({ accountIds, secret: this.config.get('MOD_INGEST_SECRET'), now });
    const asked = await this.redis.eval(
      MOD_BADGES_QUOTA.script,
      1,
      quotaKey({ deviceId, now }),
      MOD_BADGES_QUOTA.distinctIdsPerDay,
      MOD_BADGES_QUOTA.ttlSeconds,
      ...members
    );

    return Number(asked) === MOD_BADGES_QUOTA.refused ? secondsUntilNextDay(now) : null;
  }
}
