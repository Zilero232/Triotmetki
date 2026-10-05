import { utc } from '@date-fns/utc';
import { Injectable } from '@nestjs/common';
import { BRONYA_INDEX } from '@otmetki/ratings';
import { startOfDay, subDays } from 'date-fns';

import type { PercentileRow } from '../aggregates.types';

import { PrismaService } from '../../../../core';
import { BRONYA_REFERENCE } from '../../../reference';
import { toTankPercentileRecord } from '../mappers';
import { ReferenceTablesService } from './reference-tables.service';

@Injectable()
export class TankPercentilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService
  ) {}

  async compute() {
    const now = new Date();
    const levels = [...BRONYA_INDEX.quantileLevels];

    const rows = await this.prisma.$queryRaw<PercentileRow[]>`
      WITH latest AS (
        SELECT tank_id, battles, wins, damage_dealt, frags, spotted, dropped_capture_points
        FROM tank_snapshot_latest
        WHERE mode = 'random' AND captured_at > ${subDays(now, BRONYA_REFERENCE.windowDays)}
      )
      SELECT
        tank_id,
        count(*)::int AS players,
        percentile_cont(${levels}::float8[]) WITHIN GROUP (ORDER BY damage_dealt::float8 / battles) AS damage,
        percentile_cont(${levels}::float8[]) WITHIN GROUP (ORDER BY wins * 100.0 / battles) AS win_rate,
        percentile_cont(${levels}::float8[]) WITHIN GROUP (ORDER BY frags::float8 / battles) AS frags,
        percentile_cont(${levels}::float8[]) WITHIN GROUP (ORDER BY spotted::float8 / battles) AS spotted,
        percentile_cont(${levels}::float8[]) WITHIN GROUP (ORDER BY dropped_capture_points::float8 / battles) AS defence
      FROM latest
      WHERE battles >= ${BRONYA_REFERENCE.minTankBattles}
      GROUP BY tank_id
      HAVING count(*) >= ${BRONYA_REFERENCE.minPlayers}
    `;

    const date = startOfDay(now, { in: utc });

    await this.prisma.$transaction([
      this.prisma.tankPercentile.deleteMany({ where: { distribution: BRONYA_REFERENCE.distribution, date } }),
      this.prisma.tankPercentile.createMany({
        data: rows.map((row) => toTankPercentileRecord({ row, date }))
      })
    ]);

    this.tables.invalidate();

    return { tanks: rows.length };
  }
}
