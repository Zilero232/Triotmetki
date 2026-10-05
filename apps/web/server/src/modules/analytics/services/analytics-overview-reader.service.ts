import type { AnalyticsOverview, SessionCompareRow } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { AnalyticsInput, PeriodWindow, PlaytimeWindowInput, SessionsInput } from '../analytics.types';
import type { AnalyticsQueries } from '../providers/analytics-queries.provider.types';

import { percentOf } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ExpectedValuesReaderService, VehicleCatalogService } from '../../reference';
import { ANALYTICS_QUERIES } from '../config/queries.constants';
import { ANALYTICS_SQL, ANALYTICS_WINDOW } from '../config/window.constants';
import { splitPlaytime } from '../lib/playtime-split/playtime-split';
import { breakdown, statLine, trendPoints } from '../lib/stat-line/stat-line';
import { tilt } from '../lib/tilt/tilt';
import { periodStart, trendGranularity } from '../lib/window/window';
import { toAggregateRow } from '../mappers/aggregate-row.mappers';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class AnalyticsOverviewReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly expected: ExpectedValuesReaderService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(ANALYTICS_QUERIES) private readonly queries: AnalyticsQueries
  ) {}

  async overview({ userId, account, period }: AnalyticsInput): Promise<AnalyticsOverview> {
    const accountId = await this.accounts.resolve({ userId, account });
    const window: PeriodWindow = { accountId, period, from: periodStart({ period, now: new Date() }) };

    const deltas = { db: this.prisma.$kysely, accountId: Number(accountId), from: window.from ?? ANALYTICS_SQL.epoch };
    const modWhere = { accountId, battleType: ANALYTICS_SQL.randomBattleType, ...(window.from ? { startedAt: { gte: window.from } } : {}) };

    const [tankRows, trendRows, modCount, recentMod, expected, catalog] = await Promise.all([
      this.queries.tankDeltaTotals(deltas),
      this.queries.tankDeltaBuckets({ ...deltas, granularity: trendGranularity(period) }),
      this.prisma.battle.count({ where: modWhere }),
      this.prisma.battle.findMany({
        where: modWhere,
        orderBy: { startedAt: 'desc' },
        take: ANALYTICS_WINDOW.tiltMaxBattles,
        select: { result: true, startedAt: true }
      }),
      this.expected.all(),
      this.catalog.all()
    ]);

    const rows = tankRows.map(toAggregateRow);
    const totals = statLine({ rows, expected });
    const vehicles = new Map([...catalog.values()].map((entry) => [entry.summary.tankId, entry.summary]));
    const [playtime, sessions] = await Promise.all([this.playtime({ ...window, hasModBattles: modCount > 0 }), this.sessions({ window, totals })]);

    return {
      accountId: Number(accountId),
      period,
      modBattles: modCount,
      totals,
      breakdown: breakdown({ rows, expected, vehicles }),
      ...splitPlaytime(playtime),
      trend: trendPoints({ rows: trendRows.map((row) => ({ ...toAggregateRow(row), bucket: row.bucket })), expected }),
      tilt: tilt(recentMod.toReversed()),
      sessions
    };
  }

  private playtime({ accountId, from, hasModBattles }: PlaytimeWindowInput) {
    const window = {
      db: this.prisma.$kysely,
      accountId: Number(accountId),
      from: from ?? ANALYTICS_SQL.epoch,
      weekStartsOn: ANALYTICS_SQL.weekStartsOn
    };

    return hasModBattles
      ? this.queries.playtimeFromBattles({ ...window, battleType: ANALYTICS_SQL.randomBattleType })
      : this.queries.playtimeFromDeltas(window);
  }

  private async sessions({ window, totals }: SessionsInput): Promise<SessionCompareRow[]> {
    const sessions = await this.prisma.playSession.findMany({
      where: { accountId: window.accountId, battles: { gt: 0 }, ...(window.from ? { startedAt: { gte: window.from } } : {}) },
      orderBy: { startedAt: 'desc' },
      take: ANALYTICS_WINDOW.sessions,
      select: { id: true, startedAt: true, battles: true, wins: true, damageDealt: true, wn8: true }
    });

    return sessions.map((session) => {
      const winRate = percentOf({ value: session.wins, by: session.battles });
      const avgDamage = session.damageDealt / session.battles;

      return {
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        battles: session.battles,
        winRate,
        avgDamage,
        wn8: session.wn8,
        winRateDelta: winRate === null || totals.winRate === null ? null : winRate - totals.winRate,
        avgDamageDelta: totals.avgDamage === null ? null : avgDamage - totals.avgDamage
      };
    });
  }
}
