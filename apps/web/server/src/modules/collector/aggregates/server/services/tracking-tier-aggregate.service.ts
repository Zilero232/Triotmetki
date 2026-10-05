import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { ServerQueries } from '../server.types';

import { PrismaService } from '../../../../../core';
import { TRACKING_TIER_AGGREGATE } from '../config/server.constants';
import { SERVER_AGGREGATE_TOKENS } from '../config/tokens.constants';

@Injectable()
export class TrackingTierAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVER_AGGREGATE_TOKENS.queries) private readonly queries: ServerQueries
  ) {}

  async run() {
    const now = new Date();
    const db = this.prisma.$kysely;
    const dormantSince = subDays(now, TRACKING_TIER_AGGREGATE.dormantAfterDays);
    const promoted = await this.queries.promotePinned({ db, now });
    const demoted = await this.queries.demoteIdle({ db, idleSince: subDays(now, TRACKING_TIER_AGGREGATE.activeIdleDays) });

    const revived = await this.prisma.player.updateMany({
      where: { trackingTier: 'dormant', lastBattleAt: { gte: dormantSince } },
      data: { trackingTier: 'population' }
    });

    const retired = await this.prisma.player.updateMany({
      where: { trackingTier: 'population', lastBattleAt: { lt: dormantSince } },
      data: { trackingTier: 'dormant' }
    });

    return { promoted, demoted, revived: revived.count, retired: retired.count };
  }
}
