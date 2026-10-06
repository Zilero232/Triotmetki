import type { ModBadges } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { BadgesReadInput } from '../mod-badges.types';

import { toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { MOD_BADGES_API } from '../config/mod-badges.constants';
import { visibleAccounts } from '../lib/badge-visibility/badge-visibility';

@Injectable()
export class ModBadgesReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async visible({ accountIds, now }: BadgesReadInput): Promise<ModBadges> {
    const devices = await this.prisma.modDevice.findMany({
      where: {
        accountId: { in: accountIds.map(BigInt) },
        revokedAt: null,
        badgeVisible: { not: null },
        lastSeenAt: { gte: subDays(now, MOD_BADGES_API.activeDays) }
      },
      select: { accountId: true, badgeVisible: true }
    });

    const candidates = visibleAccounts({ devices, hidden: new Set() });

    if (candidates.length === 0) {
      return { account_ids: [] };
    }

    const hiddenPlayers = await this.prisma.player.findMany({
      where: { accountId: { in: candidates }, isHidden: true },
      select: { accountId: true }
    });

    const hidden = new Set(hiddenPlayers.map((player) => player.accountId));

    return { account_ids: visibleAccounts({ devices, hidden }).map(toNumber) };
  }
}
