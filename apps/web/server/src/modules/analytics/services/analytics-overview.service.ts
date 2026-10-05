import type { AnalyticsOverview, SessionCompareRow } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { PlaytimeRow } from '../../players';
import type { AnalyticsInput, PeriodWindow, SessionsInput, TrendInput, TrendRow, WindowInput } from '../analytics.types';
import type { RawTankRow } from '../lib';

import { Prisma } from '../../../../generated';
import { percentOf } from '../../../common/lib';
import { TIME } from '../../../config';
import { PrismaService } from '../../../core';
import { ExpectedValuesService, VehicleCatalogService } from '../../reference';
import { ANALYTICS_SQL, ANALYTICS_WINDOW } from '../config';
import { breakdown, periodStart, splitPlaytime, statLine, tilt, trendGranularity, trendPoints } from '../lib';
import { toAggregateRow } from '../mappers';
import { OwnAccountService } from './own-account.service';

@Injectable()
export class AnalyticsOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly expected: ExpectedValuesService,
    private readonly accounts: OwnAccountService
  ) {}

  async overview({ userId, account, period }: AnalyticsInput): Promise<AnalyticsOverview> {
    const accountId = await this.accounts.resolve({ userId, account });
    const window: PeriodWindow = { accountId, period, from: periodStart({ period, now: new Date() }) };

    const modWhere = { accountId, battleType: ANALYTICS_SQL.randomBattleType, ...(window.from ? { startedAt: { gte: window.from } } : {}) };

    const [tankRows, trendRows, modCount, recentMod, expected, catalog] = await Promise.all([
      this.tankTotals(window),
      this.trend({ ...window, granularity: trendGranularity(period) }),
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
    const [playtime, sessions] = await Promise.all([
      modCount > 0 ? this.battlePlaytime(window) : this.deltaPlaytime(window),
      this.sessions({ window, totals })
    ]);

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

  async tankTotals({ accountId, from }: WindowInput): Promise<RawTankRow[]> {
    return this.prisma.$queryRaw<RawTankRow[]>`
      SELECT tank_id,
             sum(battles)::float8 AS battles, sum(wins)::float8 AS wins, sum(damage_dealt)::float8 AS damage,
             sum(frags)::float8 AS frags, sum(spotted)::float8 AS spotted, sum(capture_points)::float8 AS cap,
             sum(dropped_capture_points)::float8 AS def, sum(survived_battles)::float8 AS survived
      FROM tank_battle_delta
      WHERE account_id = ${accountId} AND mode = 'random'::stats_mode AND captured_at >= ${from ?? ANALYTICS_SQL.epoch}
      GROUP BY tank_id
    `;
  }

  async trend({ accountId, from, granularity, tankId }: TrendInput): Promise<TrendRow[]> {
    const tankFilter = tankId === undefined ? Prisma.empty : Prisma.sql`AND tank_id = ${tankId}`;

    return this.prisma.$queryRaw<TrendRow[]>`
      SELECT (date_trunc(${granularity}, captured_at AT TIME ZONE ${TIME.zone}) AT TIME ZONE ${TIME.zone}) AS bucket,
             tank_id,
             sum(battles)::float8 AS battles, sum(wins)::float8 AS wins, sum(damage_dealt)::float8 AS damage,
             sum(frags)::float8 AS frags, sum(spotted)::float8 AS spotted, sum(capture_points)::float8 AS cap,
             sum(dropped_capture_points)::float8 AS def, sum(survived_battles)::float8 AS survived
      FROM tank_battle_delta
      WHERE account_id = ${accountId} AND mode = 'random'::stats_mode AND captured_at >= ${from ?? ANALYTICS_SQL.epoch} ${tankFilter}
      GROUP BY 1, 2
    `;
  }

  private async battlePlaytime({ accountId, from }: WindowInput): Promise<PlaytimeRow[]> {
    return this.prisma.$queryRaw<PlaytimeRow[]>`
      SELECT extract(dow FROM started_at AT TIME ZONE ${TIME.zone})::int AS weekday,
             extract(hour FROM started_at AT TIME ZONE ${TIME.zone})::int AS hour,
             count(*)::float8 AS battles,
             count(*) FILTER (WHERE result = 'win'::battle_result)::float8 AS wins,
             sum(damage_dealt)::float8 AS damage
      FROM battle
      WHERE account_id = ${accountId} AND battle_type = ${ANALYTICS_SQL.randomBattleType} AND started_at >= ${from ?? ANALYTICS_SQL.epoch}
      GROUP BY 1, 2
    `;
  }

  private async deltaPlaytime({ accountId, from }: WindowInput): Promise<PlaytimeRow[]> {
    return this.prisma.$queryRaw<PlaytimeRow[]>`
      SELECT extract(dow FROM captured_at AT TIME ZONE ${TIME.zone})::int AS weekday,
             extract(hour FROM captured_at AT TIME ZONE ${TIME.zone})::int AS hour,
             sum(battles)::float8 AS battles,
             sum(wins)::float8 AS wins,
             sum(damage_dealt)::float8 AS damage
      FROM tank_battle_delta
      WHERE account_id = ${accountId} AND mode = 'random'::stats_mode AND captured_at >= ${from ?? ANALYTICS_SQL.epoch}
      GROUP BY 1, 2
    `;
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
