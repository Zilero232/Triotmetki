import type { MoeCurve } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';
import { MOE_CURVE } from '@otmetki/schemas';
import { subDays } from 'date-fns';

import type { MoeCurveQueries } from '../queries/moe-curve.types';

import { PrismaService } from '../../../core';
import { ThresholdsService, toMoeThreshold } from '../../reference';
import { MOE_CURVE_QUERIES, MOE_CURVE_SQL } from '../config/marks.constants';
import { curvePoints, curveSteps } from '../lib/moe-curve/moe-curve';
import { moeCurveQueries } from '../queries/moe-curve.queries';

@Injectable()
export class MoeCurveReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly thresholds: ThresholdsService,
    @Optional() @Inject(MOE_CURVE_QUERIES) private readonly queries: MoeCurveQueries = moeCurveQueries
  ) {}

  async curve(tankId: number): Promise<MoeCurve> {
    const [moe, rows] = await Promise.all([
      this.thresholds.moe(tankId),
      this.queries.moeCurve({
        db: this.prisma.$kysely,
        tankId,
        since: subDays(new Date(), MOE_CURVE.windowDays),
        steps: curveSteps(),
        band: MOE_CURVE.bandPercent,
        battleType: MOE_CURVE_SQL.randomBattleType
      })
    ]);

    return {
      tankId,
      windowDays: MOE_CURVE.windowDays,
      bandPercent: MOE_CURVE.bandPercent,
      minPlayers: MOE_CURVE.minPlayers,
      thresholds: moe ? toMoeThreshold(moe) : null,
      points: curvePoints(rows)
    };
  }
}
