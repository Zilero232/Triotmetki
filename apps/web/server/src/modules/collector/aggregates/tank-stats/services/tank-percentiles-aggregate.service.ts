import { utc } from '@date-fns/utc';
import { Inject, Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';

import type { TankStatsQueries } from '../tank-stats.types';

import { PrismaService } from '../../../../../core';
import { BRONYA_REFERENCE } from '../../../../reference';
import { ReferenceTablesService } from '../../player-ratings';
import { TANK_STATS_TOKENS } from '../config/tokens.constants';
import { toTankPercentileRecord } from '../mappers/tank-percentile.mappers';

@Injectable()
export class TankPercentilesAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService,
    @Inject(TANK_STATS_TOKENS.queries) private readonly queries: TankStatsQueries
  ) {}

  async compute() {
    const now = new Date();
    const rows = await this.queries.tankPercentileRows({ db: this.prisma.$kysely, since: subDays(now, BRONYA_REFERENCE.windowDays) });
    const date = startOfDay(now, { in: utc });

    await this.prisma.$transaction([
      this.prisma.tankPercentile.deleteMany({ where: { distribution: BRONYA_REFERENCE.distribution, date } }),
      this.prisma.tankPercentile.createMany({ data: rows.map((row) => toTankPercentileRecord({ row, date })) })
    ]);

    this.tables.invalidate();

    return { tanks: rows.length };
  }
}
