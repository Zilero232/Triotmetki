import type { TankChallenges, TankProgressList } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { groupBy, sortBy } from 'remeda';

import type { UserAtInput } from '../progression.types';

import { toIsoDate, weekWindow } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { EntitlementsService } from '../../billing';
import { PROGRESS_LIST } from '../config/tank-challenges.constants';
import { toTankChallengeSet, toTankProgressItem } from '../mappers/tank-progress-view.mappers';

@Injectable()
export class TankProgressReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly lestaAccounts: UserAccountsReaderService
  ) {}

  async list(userId: string): Promise<TankProgressList> {
    const [accountIds, isPlus] = await Promise.all([this.lestaAccounts.accountIds(userId), this.entitlements.isPlus(userId)]);
    const rows = await this.prisma.playerTank.findMany({
      where: { accountId: { in: accountIds }, progressXp: { gt: 0 } },
      orderBy: [{ progressXp: 'desc' }, { tankId: 'asc' }],
      take: PROGRESS_LIST.limit,
      select: { accountId: true, tankId: true, progressXp: true, progressBattles: true, updatedAt: true }
    });

    return {
      isAccruing: isPlus,
      items: rows.map(toTankProgressItem)
    };
  }

  async challenges({ userId, now }: UserAtInput): Promise<TankChallenges> {
    const { weekStart, end } = weekWindow(now);
    const rows = await this.prisma.tankChallengeProgress.findMany({
      where: { accountId: { in: await this.lestaAccounts.accountIds(userId) }, weekStart },
      orderBy: [{ accountId: 'asc' }, { tankId: 'asc' }, { code: 'asc' }]
    });

    const sets = Object.values(groupBy(rows, (row) => `${row.accountId}:${row.tankId}`)).map(toTankChallengeSet);

    return {
      weekStart: toIsoDate(weekStart) ?? '',
      endsAt: end.toISOString(),
      sets: sortBy(sets, [(set) => set.items.filter((item) => item.completedAt === null).length, 'desc'])
    };
  }
}
