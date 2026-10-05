import type { TankTrend } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { max, subDays } from 'date-fns';

import type { TanksQueries } from '../providers/tanks-queries.provider.types';
import type { TankTrendInput } from '../tanks.types';

import { moscowDay, moscowDayStart, STATS_MODE_SQL } from '../../../common/lib';
import { TIMESCALE } from '../../../config';
import { PrismaService } from '../../../core';
import { TANKS_QUERIES } from '../config';
import { toTrendPoints } from '../mappers';

@Injectable()
export class TankTrendReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TANKS_QUERIES) private readonly queries: TanksQueries
  ) {}

  async trend({ tankId, query }: TankTrendInput): Promise<TankTrend> {
    const now = new Date();
    const from = moscowDayStart(subDays(now, query.days - 1));
    const recent = max([from, moscowDayStart(subDays(now, TIMESCALE.compressAfterDays - 1))]);

    const rows = await this.queries.tankTrendRows({
      db: this.prisma.$kysely,
      tankId,
      mode: STATS_MODE_SQL[query.mode],
      from,
      recent,
      recentDay: moscowDay(recent)
    });

    return { tankId, mode: query.mode, days: query.days, points: toTrendPoints(rows) };
  }
}
