import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { ReportPresenceInput } from '../mod-badges.types';

import { modPresenceKey } from '../../../common/lib';
import { REDIS } from '../../../core';
import { PurgeGuardService } from '../../collector/purge';
import { MOD_BADGE_PRESENCE } from '../config/badge-presence.constants';

@Injectable()
export class ModBadgePresenceWriterService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly purgeGuard: PurgeGuardService
  ) {}

  async report({ accountId, visible }: ReportPresenceInput): Promise<void> {
    const isShown = visible && !(await this.purgeGuard.blocked([accountId])).has(accountId);

    if (isShown) {
      await this.redis.set(modPresenceKey(accountId), MOD_BADGE_PRESENCE.value, 'EX', MOD_BADGE_PRESENCE.ttlSeconds);
    } else {
      await this.redis.del(modPresenceKey(accountId));
    }
  }
}
