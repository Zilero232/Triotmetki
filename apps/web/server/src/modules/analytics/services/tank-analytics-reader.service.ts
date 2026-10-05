import type { AnalyticsTank } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { TankAnalyticsInput } from '../analytics.types';
import type { AnalyticsQueries } from '../providers/analytics-queries.provider.types';

import { PrismaService } from '../../../core';
import { ExpectedValuesReaderService, VehicleCatalogService } from '../../reference';
import { ANALYTICS_QUERIES, ANALYTICS_SQL, TANK_ANALYTICS } from '../config';
import { statLine, trendPoints } from '../lib';
import { toAggregateRow } from '../mappers';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class TankAnalyticsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly expected: ExpectedValuesReaderService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(ANALYTICS_QUERIES) private readonly queries: AnalyticsQueries
  ) {}

  async tank({ userId, account, tankId, granularity }: TankAnalyticsInput): Promise<AnalyticsTank> {
    const accountId = await this.accounts.resolve({ userId, account });

    const [rows, moe, expected, catalog] = await Promise.all([
      this.queries.tankDeltaBuckets({ db: this.prisma.$kysely, accountId: Number(accountId), from: ANALYTICS_SQL.epoch, granularity, tankId }),
      this.prisma.battle.findMany({
        where: { accountId, tankId, moePercent: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: TANK_ANALYTICS.moePoints,
        select: { startedAt: true, moePercent: true }
      }),
      this.expected.all(),
      this.catalog.all()
    ]);

    const buckets = rows.map((row) => ({ ...toAggregateRow(row), bucket: row.bucket }));

    return {
      accountId: Number(accountId),
      vehicle: catalog.get(tankId)?.summary ?? null,
      granularity,
      totals: statLine({ rows: buckets, expected }),
      points: trendPoints({ rows: buckets, expected }),
      moe: moe
        .flatMap((battle) => (battle.moePercent === null ? [] : [{ at: battle.startedAt.toISOString(), percent: battle.moePercent }]))
        .toReversed()
    };
  }
}
