import type { AnalyticsPlatoons, PlatoonMate } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { AnalyticsInput } from '../analytics.types';
import type { AnalyticsQueries } from '../providers/analytics-queries.provider.types';

import { PrismaService } from '../../../core';
import { ExpectedValuesReaderService } from '../../reference';
import { PLATOON_CHEMISTRY } from '../config/platoon-chemistry.constants';
import { ANALYTICS_QUERIES } from '../config/queries.constants';
import { ANALYTICS_SQL } from '../config/window.constants';
import { winRateDelta } from '../lib/map-advisor/map-advisor';
import { statLine } from '../lib/stat-line/stat-line';
import { periodStart } from '../lib/window/window';
import { toAggregateRow } from '../mappers/aggregate-row.mappers';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class PlatoonChemistryReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expected: ExpectedValuesReaderService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(ANALYTICS_QUERIES) private readonly queries: AnalyticsQueries
  ) {}

  async platoons({ userId, account, period }: AnalyticsInput): Promise<AnalyticsPlatoons> {
    const accountId = await this.accounts.resolve({ userId, account });
    const from = periodStart({ period, now: new Date() }) ?? ANALYTICS_SQL.epoch;
    const own = { db: this.prisma.$kysely, accountId: Number(accountId), battleType: ANALYTICS_SQL.randomBattleType, from };

    const [sized, mates, expected] = await Promise.all([this.queries.platoonSplit(own), this.queries.platoonMates(own), this.expected.all()]);

    const solo = statLine({ rows: sized.filter((row) => !row.is_platoon).map(toAggregateRow), expected });
    const platoon = statLine({ rows: sized.filter((row) => row.is_platoon).map(toAggregateRow), expected });
    const mateIds = [...new Set(mates.map((row) => row.mate))];
    const players = await this.prisma.player.findMany({
      where: { accountId: { in: mateIds.map((mate) => BigInt(mate)) } },
      select: { accountId: true, nickname: true }
    });

    const nicknameOf = new Map(players.map((player) => [Number(player.accountId), player.nickname]));

    const rows: PlatoonMate[] = mateIds.map((mate) => {
      const line = statLine({ rows: mates.filter((row) => row.mate === mate).map(toAggregateRow), expected });

      return {
        accountId: mate,
        nickname: nicknameOf.get(mate) ?? null,
        ...line,
        winRateDelta: winRateDelta({ winRate: line.winRate, average: solo.winRate })
      };
    });

    return {
      accountId: Number(accountId),
      period,
      tracked: solo.battles + platoon.battles,
      solo,
      platoon,
      mates: rows.toSorted((left, right) => right.battles - left.battles).slice(0, PLATOON_CHEMISTRY.maxMates)
    };
  }
}
