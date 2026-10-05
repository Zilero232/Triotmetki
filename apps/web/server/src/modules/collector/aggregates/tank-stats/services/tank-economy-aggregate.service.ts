import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { TankStatsQueries } from '../tank-stats.types';

import { PrismaService } from '../../../../../core';
import { TANK_ECONOMY_AGGREGATE } from '../config/tank-stats.constants';
import { TANK_STATS_TOKENS } from '../config/tokens.constants';
import { toEconomyRecord } from '../mappers/tank-economy.mappers';

@Injectable()
export class TankEconomyAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TANK_STATS_TOKENS.queries) private readonly queries: TankStatsQueries
  ) {}

  async compute() {
    const computedAt = new Date();
    const { windowDays } = TANK_ECONOMY_AGGREGATE;
    const rows = await this.queries.tankEconomyRows({ db: this.prisma.$kysely, since: subDays(computedAt, windowDays) });

    await this.prisma.$transaction([
      this.prisma.tankEconomyAggregate.deleteMany({}),
      this.prisma.tankEconomyAggregate.createMany({ data: rows.map((row) => toEconomyRecord({ row, windowDays, computedAt })) })
    ]);

    return { rows: rows.length };
  }
}
