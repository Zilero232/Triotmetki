import { utc } from '@date-fns/utc';
import { Inject, Injectable } from '@nestjs/common';
import { MOE_CURVE } from '@otmetki/schemas';
import { startOfDay, subDays } from 'date-fns';

import type { ReferenceQueries } from '../providers/reference-queries.types';
import type { ReplaceMoeEstimatesInput } from '../reference.types';

import { PrismaService } from '../../../../core';
import { moeThresholdLevels } from '../../../reference';
import { MOE_ESTIMATE } from '../config/moe-estimate.constants';
import { moeEstimates } from '../lib/moe-estimate';
import { REFERENCE_QUERIES } from '../providers/reference-queries.provider';

@Injectable()
export class MoeEstimateAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFERENCE_QUERIES) private readonly queries: ReferenceQueries
  ) {}

  async sync() {
    const now = new Date();

    const rows = await this.queries.moeEstimatePoints({
      db: this.prisma.$kysely,
      since: subDays(now, MOE_CURVE.windowDays),
      steps: Object.values(MOE_ESTIMATE.percents),
      band: MOE_CURVE.bandPercent,
      battleType: MOE_ESTIMATE.randomBattleType
    });

    const estimates = moeEstimates(rows);

    if (estimates.length === 0) {
      return { vehicles: 0 };
    }

    await this.replaceToday({ estimates, date: startOfDay(now, { in: utc }) });

    return { vehicles: estimates.length };
  }

  private async replaceToday({ estimates, date }: ReplaceMoeEstimatesInput) {
    await this.prisma.$transaction([
      this.prisma.tankThreshold.deleteMany({ where: { kind: 'moe', source: 'otmetki', date } }),
      this.prisma.tankThreshold.createMany({
        data: estimates.map(({ tankId, sampleSize, ...levels }) => ({
          kind: 'moe' as const,
          tankId,
          date,
          source: 'otmetki' as const,
          sampleSize,
          ...moeThresholdLevels(levels)
        }))
      })
    ]);
  }
}
