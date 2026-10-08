import type { ModBadges } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { modPresenceKey } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { PurgeGuardService } from '../../collector/purge';
import { presentAccounts } from '../lib/badge-presence/badge-presence';

@Injectable()
export class ModBadgePresenceReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly purgeGuard: PurgeGuardService
  ) {}

  async visible(accountIds: number[]): Promise<ModBadges> {
    if (accountIds.length === 0) {
      return { account_ids: [] };
    }

    const flags = await this.redis.mget(accountIds.map(modPresenceKey));
    const candidates = presentAccounts({ accountIds, flags, hidden: new Set() });

    if (candidates.length === 0) {
      return { account_ids: [] };
    }

    const [hiddenPlayers, blocked] = await Promise.all([
      this.prisma.player.findMany({ where: { accountId: { in: candidates.map(BigInt) }, isHidden: true }, select: { accountId: true } }),
      this.purgeGuard.blocked(candidates)
    ]);

    const hidden = new Set([...hiddenPlayers.map((player) => player.accountId), ...[...blocked].map(BigInt)]);

    return { account_ids: presentAccounts({ accountIds, flags, hidden }) };
  }
}
