import { Inject, Injectable } from '@nestjs/common';
import { BUILD_USAGE } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { entries, groupBy } from 'remeda';

import type { UsageSample } from '../lib/build-usage';
import type { ComputeTankUsageInput, MetaQueries, UsageSamplesInput } from '../meta.types';

import { Prisma } from '../../../../../../generated';
import { toJsonValue } from '../../../../../common/lib';
import { PrismaService } from '../../../../../core';
import { readStoredLoadout } from '../../../../mod';
import { META_TOKENS } from '../config/tokens.constants';
import { BUILD_MODE_BONUS_TYPES, BUILD_USAGE_AGGREGATE, groupUsage, modeOfBonusType } from '../lib/build-usage';

@Injectable()
export class BuildUsageAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(META_TOKENS.queries) private readonly queries: MetaQueries
  ) {}

  async compute() {
    const startedAt = new Date();
    const since = subDays(startedAt, BUILD_USAGE.windowDays);
    const battleTypes = entries(BUILD_MODE_BONUS_TYPES).flatMap(([, types]) => types.map(String));
    const gameVersion = await this.gameVersion();

    const [tanks, rankRows] = await Promise.all([
      this.prisma.battle.groupBy({
        by: ['tankId'],
        where: { startedAt: { gte: since }, battleType: { in: battleTypes }, loadout: { not: Prisma.DbNull } }
      }),
      this.queries.buildRanks({ db: this.prisma.$kysely, since, battleTypes })
    ]);

    const ranksByTank = groupBy(rankRows, (row) => row.tank_id);
    let groups = 0;

    for (const { tankId } of tanks) {
      const ranks = (ranksByTank[tankId] ?? []).map((row) => ({ accountId: String(row.account_id), rank: row.rank }));

      groups += await this.computeTank({ tankId, since, battleTypes, gameVersion, ranks });
    }

    const stale = await this.prisma.buildUsageAggregate.deleteMany({ where: { gameVersion, computedAt: { lt: startedAt } } });

    return { tanks: tanks.length, groups, removed: stale.count, gameVersion };
  }

  private async computeTank({ tankId, since, battleTypes, gameVersion, ranks }: ComputeTankUsageInput): Promise<number> {
    const samples = await this.usageSamples({ tankId, since, battleTypes });
    const groups = groupUsage({ samples, ranks });
    const computedAt = new Date();

    await this.prisma.$transaction(
      groups.map((group) => {
        const values = {
          battles: group.battles,
          players: group.players,
          winRate: group.winRate,
          avgDamage: group.avgDamage,
          usage: toJsonValue(group.usage),
          windowDays: BUILD_USAGE.windowDays,
          computedAt
        };

        return this.prisma.buildUsageAggregate.upsert({
          where: { tankId_mode_cohort_gameVersion: { tankId, mode: group.mode, cohort: group.cohort, gameVersion } },
          create: { tankId, mode: group.mode, cohort: group.cohort, gameVersion, ...values },
          update: values
        });
      })
    );

    return groups.length;
  }

  private async usageSamples({ tankId, since, battleTypes }: UsageSamplesInput): Promise<UsageSample[]> {
    const rows = await this.prisma.battle.findMany({
      where: { tankId, startedAt: { gte: since }, battleType: { in: battleTypes }, loadout: { not: Prisma.DbNull } },
      select: { accountId: true, battleType: true, result: true, damageDealt: true, loadout: true },
      orderBy: { startedAt: 'desc' },
      take: BUILD_USAGE_AGGREGATE.maxBattlesPerTank
    });

    return rows.flatMap((row): UsageSample[] => {
      const mode = modeOfBonusType(row.battleType);
      const loadout = readStoredLoadout(row.loadout);

      return mode && loadout
        ? [{ accountId: String(row.accountId), mode, won: row.result === 'draw' ? null : row.result === 'win', damage: row.damageDealt, loadout }]
        : [];
    });
  }

  private async gameVersion(): Promise<string> {
    const current = await this.prisma.gameVersion.findFirst({
      where: { isCurrent: true, isTest: false },
      select: { version: true },
      orderBy: { detectedAt: 'desc' }
    });

    return current?.version ?? BUILD_USAGE_AGGREGATE.unknownVersion;
  }
}
