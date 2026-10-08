import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { ClaimBadgeQuotaInput, ClaimClientQuotaInput } from '../mod-badges.types';

import { AppConfigService } from '../../../config';
import { REDIS } from '../../../core';
import { MOD_BADGES_QUOTA } from '../config/mod-badges.constants';
import { ipQuotaSubject } from '../lib/badge-presence/badge-presence';
import { quotaKey, quotaMembers, secondsUntilNextDay } from '../lib/badge-quota/badge-quota';

@Injectable()
export class ModBadgeQuotaWriterService {
  constructor(
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async claim({ subject, accountIds, now }: ClaimBadgeQuotaInput): Promise<number | null> {
    const members = quotaMembers({ accountIds, secret: this.config.get('MOD_INGEST_SECRET'), now });
    const asked = await this.redis.eval(
      MOD_BADGES_QUOTA.script,
      1,
      quotaKey({ subject, now }),
      MOD_BADGES_QUOTA.distinctIdsPerDay,
      MOD_BADGES_QUOTA.ttlSeconds,
      ...members
    );

    return Number(asked) === MOD_BADGES_QUOTA.refused ? secondsUntilNextDay(now) : null;
  }

  async claimForClient({ ip, accountIds, now }: ClaimClientQuotaInput): Promise<number | null> {
    return this.claim({ subject: ipQuotaSubject({ ip, secret: this.config.get('MOD_INGEST_SECRET') }), accountIds, now });
  }
}
