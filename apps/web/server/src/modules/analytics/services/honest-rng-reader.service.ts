import type { AnalyticsRng } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { sumBy } from 'remeda';

import type { AnalyticsInput } from '../analytics.types';

import { percentOf } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ANALYTICS_WINDOW } from '../config';
import { periodStart, readStoredShots, summarizeRolls } from '../lib';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class HonestRngReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: OwnAccountReaderService
  ) {}

  async rng({ userId, account, period }: AnalyticsInput): Promise<AnalyticsRng> {
    const accountId = await this.accounts.resolve({ userId, account });
    const from = periodStart({ period, now: new Date() });

    const where = { accountId, ...(from ? { startedAt: { gte: from } } : {}) };

    const [total, battles] = await Promise.all([
      this.prisma.battle.count({ where }),
      this.prisma.battle.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: ANALYTICS_WINDOW.rngMaxBattles,
        select: { shots: true, shotsFired: true, shotsHit: true, shotsPierced: true }
      })
    ]);

    const shotsFired = sumBy(battles, (battle) => battle.shotsFired ?? 0);
    const hits = sumBy(battles, (battle) => battle.shotsHit ?? 0);

    return {
      accountId: Number(accountId),
      period,
      battles: total,
      ...summarizeRolls(battles.flatMap((battle) => readStoredShots(battle.shots))),
      accuracy: {
        shotsFired,
        hitRate: percentOf({ value: hits, by: shotsFired }),
        penRate: percentOf({ value: sumBy(battles, (battle) => battle.shotsPierced ?? 0), by: hits })
      }
    };
  }
}
