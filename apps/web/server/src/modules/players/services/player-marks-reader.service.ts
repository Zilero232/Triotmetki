import type { PlayerMarks } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { sortBy } from 'remeda';

import type { PlayerQueries } from '../providers/player-queries.provider.types';

import { PrismaService } from '../../../core';
import { ThresholdsReaderService, VehicleCatalogService } from '../../reference';
import { PLAYER_MARKS, PLAYER_QUERIES } from '../config';
import { marksSummary } from '../lib';
import { toPlayerMark } from '../mappers';

@Injectable()
export class PlayerMarksReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly thresholds: ThresholdsReaderService,
    @Inject(PLAYER_QUERIES) private readonly queries: PlayerQueries
  ) {}

  async marks(accountId: bigint): Promise<PlayerMarks> {
    const [tanks, { moe }, catalog, combined, ratings] = await Promise.all([
      this.prisma.playerTank.findMany({ where: { accountId } }),
      this.thresholds.latest(),
      this.catalog.all(),
      this.queries.combinedDamage({ db: this.prisma.$kysely, accountId: Number(accountId) }),
      this.prisma.accountTankRating.findMany({ where: { accountId, period: 'overall' }, select: { tankId: true, avgDamage: true } })
    ]);

    const combinedOf = new Map(combined.map((row) => [row.tank_id, row.combined]));
    const damageOf = new Map(ratings.map((row) => [row.tankId, row.avgDamage]));

    const items = tanks.flatMap((tank) => {
      const vehicle = catalog.get(tank.tankId)?.summary;

      if (!vehicle || vehicle.tier < PLAYER_MARKS.minTier) {
        return [];
      }

      return [
        toPlayerMark({
          tank,
          vehicle,
          threshold: moe.get(tank.tankId),
          fromBattles: combinedOf.get(tank.tankId),
          fromRating: damageOf.get(tank.tankId)
        })
      ];
    });

    return {
      summary: marksSummary(items),
      items: sortBy(items, [(item) => item.damageToNextMark ?? Number.POSITIVE_INFINITY, 'asc'], [(item) => item.battles, 'desc'])
    };
  }
}
