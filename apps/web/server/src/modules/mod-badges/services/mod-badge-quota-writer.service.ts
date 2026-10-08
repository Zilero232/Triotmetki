import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type {
  ClaimBadgeQuotaInput,
  ClaimClientQuotaInput,
  ClaimOwnPresenceInput,
  ClaimQuotaKeysInput,
  ClientQuotaKeysInput
} from '../mod-badges.types';

import { secondsUntilNextDay } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { REDIS } from '../../../core';
import { MOD_BADGES_QUOTA } from '../config/mod-badges.constants';
import { ipQuotaSubjects } from '../lib/badge-presence/badge-presence';
import { quotaKey, quotaMembers } from '../lib/badge-quota/badge-quota';

@Injectable()
export class ModBadgeQuotaWriterService {
  constructor(
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async claim({ subject, accountIds, now }: ClaimBadgeQuotaInput): Promise<number | null> {
    const keys = [quotaKey({ prefix: MOD_BADGES_QUOTA.keyPrefix, subject, now })];
    const isClaimed = await this.claimKeys({ keys, accountIds, limit: MOD_BADGES_QUOTA.distinctIdsPerDay, now });

    return isClaimed ? null : secondsUntilNextDay(now);
  }

  async claimForClient({ ip, accountIds, now }: ClaimClientQuotaInput): Promise<number | null> {
    const keys = this.clientKeys({ ip, prefix: MOD_BADGES_QUOTA.keyPrefix, now });
    const isClaimed = await this.claimKeys({ keys, accountIds, limit: MOD_BADGES_QUOTA.distinctIdsPerDay, now });

    return isClaimed ? null : secondsUntilNextDay(now);
  }

  async claimOwnForClient({ ip, accountId, now }: ClaimOwnPresenceInput): Promise<boolean> {
    const keys = this.clientKeys({ ip, prefix: MOD_BADGES_QUOTA.ownKeyPrefix, now });

    return this.claimKeys({ keys, accountIds: [accountId], limit: MOD_BADGES_QUOTA.ownIdsPerDay, now });
  }

  private clientKeys({ ip, prefix, now }: ClientQuotaKeysInput): string[] {
    const subjects = ipQuotaSubjects({ ip, secret: this.config.get('MOD_INGEST_SECRET') });

    return subjects.map((subject) => quotaKey({ prefix, subject, now }));
  }

  private async claimKeys({ keys, accountIds, limit, now }: ClaimQuotaKeysInput): Promise<boolean> {
    const members = quotaMembers({ accountIds, secret: this.config.get('MOD_INGEST_SECRET'), now });
    const answer = await this.redis.eval(MOD_BADGES_QUOTA.script, keys.length, ...keys, limit, MOD_BADGES_QUOTA.ttlSeconds, ...members);

    return Number(answer) !== MOD_BADGES_QUOTA.refused;
  }
}
