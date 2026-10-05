import type { ExpectedValues, TankReference } from '@otmetki/ratings';

import { Injectable } from '@nestjs/common';

import type { CachedTables, ReferenceTables } from '../player-ratings.types';

import { PrismaService } from '../../../../../core';
import { BRONYA_REFERENCE, parseBronyaReference } from '../../../../reference';
import { PLAYER_RATINGS_AGGREGATE } from '../config/player-ratings.constants';

@Injectable()
export class ReferenceTablesService {
  private cached: CachedTables | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async tables(): Promise<ReferenceTables> {
    if (this.cached && Date.now() - this.cached.loadedAt < PLAYER_RATINGS_AGGREGATE.referenceCacheTtlMs) {
      return this.cached.tables;
    }

    const [expected, tiers, references] = await Promise.all([this.expected(), this.tiers(), this.references()]);
    const tables = { expected, tiers, references };

    this.cached = { tables, loadedAt: Date.now() };

    return tables;
  }

  invalidate() {
    this.cached = null;
  }

  private async expected(): Promise<Map<number, ExpectedValues>> {
    const latest = await this.prisma.wn8ExpectedValue.aggregate({ _max: { date: true } });
    const date = latest._max.date;

    if (!date) {
      return new Map();
    }

    const rows = await this.prisma.wn8ExpectedValue.findMany({ where: { date } });

    return new Map(
      rows.map((row) => [
        row.tankId,
        {
          tankId: row.tankId,
          expDamage: row.expDamage,
          expFrag: row.expFrags,
          expSpot: row.expSpotted,
          expDef: row.expDefense,
          expWinRate: row.expWinRate
        }
      ])
    );
  }

  private async tiers(): Promise<Map<number, number>> {
    const vehicles = await this.prisma.vehicle.findMany({ select: { tankId: true, tier: true } });

    return new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.tier]));
  }

  private async references(): Promise<Map<number, TankReference>> {
    const latest = await this.prisma.tankPercentile.aggregate({ where: { distribution: BRONYA_REFERENCE.distribution }, _max: { date: true } });
    const date = latest._max.date;

    if (!date) {
      return new Map();
    }

    const rows = await this.prisma.tankPercentile.findMany({ where: { distribution: BRONYA_REFERENCE.distribution, date } });

    return new Map(
      rows.flatMap((row) => {
        const reference = parseBronyaReference({ tankId: row.tankId, value: row.percentiles });

        return reference ? [[row.tankId, reference]] : [];
      })
    );
  }
}
