import { Injectable } from '@nestjs/common';

import type { ChallengesView } from '../social.types';

import { toIsoDate, weekWindow } from '../../../common/lib';
import { PrismaService, UserLestaAccountsService } from '../../../core';
import { WEEKLY_CHALLENGES } from '../config/challenges.constants';
import { toWeeklyChallengeView } from '../mappers/weekly-challenge-view.mappers';

@Injectable()
export class WeeklyChallengeReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: UserLestaAccountsService
  ) {}

  async forUser(userId: string): Promise<ChallengesView> {
    const { weekStart, end } = weekWindow(new Date());
    const accountIds = await this.accounts.accountIds(userId);
    const progress = await this.prisma.weeklyChallengeProgress.findMany({ where: { weekStart, accountId: { in: accountIds } } });

    return {
      weekStart: toIsoDate(weekStart) ?? '',
      endsAt: end.toISOString(),
      challenges: WEEKLY_CHALLENGES.map((definition) => toWeeklyChallengeView({ definition, progress }))
    };
  }
}
