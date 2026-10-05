import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { TankStatsQueries } from '../tank-stats.types';

import { PrismaService } from '../../../../../core';
import { LEARNING_CURVE_AGGREGATE } from '../config/tank-stats.constants';
import { TANK_STATS_TOKENS } from '../config/tokens.constants';
import { toLearningRecord } from '../mappers/tank-economy.mappers';

@Injectable()
export class LearningCurveAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TANK_STATS_TOKENS.queries) private readonly queries: TankStatsQueries
  ) {}

  async compute() {
    const computedAt = new Date();
    const { windowDays } = LEARNING_CURVE_AGGREGATE;
    const rows = await this.queries.learningCurveRows({ db: this.prisma.$kysely, since: subDays(computedAt, windowDays) });

    await this.prisma.$transaction([
      this.prisma.tankLearningCurve.deleteMany({}),
      this.prisma.tankLearningCurve.createMany({ data: rows.map((row) => toLearningRecord({ row, windowDays, computedAt })) })
    ]);

    return { rows: rows.length };
  }
}
