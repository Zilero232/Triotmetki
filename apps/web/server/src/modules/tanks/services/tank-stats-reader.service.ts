import type { Paginated, TankServerStatsRow } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { TankStatsListInput } from '../tanks.types';

import { COHORT_TO_DB, page, SERVER_PERIOD_TO_DB, sortRows, STATS_MODE_TO_DB } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { statsRankValue, statsSampleFloor } from '../lib/stats-ranking/stats-ranking';
import { toServerStatsRow } from '../mappers/tank-stats.mappers';
import { TankTraitsReaderService } from './tank-traits-reader.service';

@Injectable()
export class TankStatsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly traits: TankTraitsReaderService
  ) {}

  async list(query: TankStatsListInput): Promise<Paginated<TankServerStatsRow>> {
    const sort = query.sort ?? 'battles';
    const floor = statsSampleFloor({ sort, minBattles: query.minBattles });

    const [rows, eligible] = await Promise.all([
      this.prisma.tankServerStats.findMany({
        where: {
          mode: STATS_MODE_TO_DB[query.mode],
          period: SERVER_PERIOD_TO_DB[query.period],
          cohort: COHORT_TO_DB[query.cohort],
          battles: { gte: floor.battles },
          players: { gte: floor.players }
        }
      }),
      this.catalog.filter(query).then((entries) => this.traits.filter({ entries, filter: query }))
    ]);

    const vehicles = new Map(eligible.map((entry) => [entry.summary.tankId, entry.summary]));

    const items = rows.flatMap((row) => {
      const vehicle = vehicles.get(row.tankId);

      return vehicle ? [toServerStatsRow({ row, vehicle, period: query.period, cohort: query.cohort, mode: query.mode })] : [];
    });

    const sorted = sortRows({
      rows: items,
      order: query.order,
      value: (row) => statsRankValue({ row, sort, order: query.order })
    });

    return page({ items: sorted, limit: query.limit, offset: query.offset });
  }
}
