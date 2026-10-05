import type { AnalyticsMaps, MapClassRow, MapStat } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { groupBy } from 'remeda';

import type { AnalyticsInput } from '../analytics.types';
import type { AnalyticsQueries } from '../providers/analytics-queries.provider.types';

import { PrismaService } from '../../../core';
import { ExpectedValuesReaderService, VehicleCatalogService } from '../../reference';
import { ANALYTICS_QUERIES } from '../config/queries.constants';
import { ANALYTICS_SQL } from '../config/window.constants';
import { mapHighlights, winRateDelta } from '../lib/map-advisor/map-advisor';
import { statLine } from '../lib/stat-line/stat-line';
import { periodStart } from '../lib/window/window';
import { toAggregateRow } from '../mappers/aggregate-row.mappers';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class MapAdvisorReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly expected: ExpectedValuesReaderService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(ANALYTICS_QUERIES) private readonly queries: AnalyticsQueries
  ) {}

  async maps({ userId, account, period }: AnalyticsInput): Promise<AnalyticsMaps> {
    const accountId = await this.accounts.resolve({ userId, account });
    const from = periodStart({ period, now: new Date() });

    const [rows, expected, catalog] = await Promise.all([
      this.queries.mapStats({
        db: this.prisma.$kysely,
        accountId: Number(accountId),
        battleType: ANALYTICS_SQL.randomBattleType,
        from: from ?? ANALYTICS_SQL.epoch
      }),
      this.expected.all(),
      this.catalog.all()
    ]);

    const typed = rows.map((row) => ({ ...row, aggregate: toAggregateRow(row), vehicleClass: catalog.get(row.tank_id)?.summary.type ?? null }));
    const totals = statLine({ rows: typed.map((row) => row.aggregate), expected });
    const arenas = await this.prisma.arena.findMany({
      where: { arenaId: { in: [...new Set(rows.map((row) => row.arena_id))] } },
      select: { arenaId: true, name: true }
    });

    const nameOf = new Map(arenas.map((arena) => [arena.arenaId, arena.name]));

    const maps: MapStat[] = Object.entries(groupBy(typed, (row) => row.arena_id)).map(([arenaId, group]) => {
      const line = statLine({ rows: group.map((row) => row.aggregate), expected });

      return { arenaId, name: nameOf.get(arenaId) ?? null, ...line, winRateDelta: winRateDelta({ winRate: line.winRate, average: totals.winRate }) };
    });

    const cells: MapClassRow[] = Object.values(groupBy(typed, (row) => `${row.arena_id}|${row.vehicleClass ?? ''}|${row.team ?? ''}`)).flatMap(
      (group) => {
        const first = group[0];

        return first
          ? [
              {
                arenaId: first.arena_id,
                vehicleClass: first.vehicleClass,
                team: first.team,
                ...statLine({ rows: group.map((row) => row.aggregate), expected })
              }
            ]
          : [];
      }
    );

    return {
      accountId: Number(accountId),
      period,
      totals,
      maps: maps.toSorted((left, right) => right.battles - left.battles),
      rows: cells.toSorted((left, right) => right.battles - left.battles),
      ...mapHighlights({ maps })
    };
  }
}
