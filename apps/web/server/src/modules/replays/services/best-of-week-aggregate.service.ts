import { Injectable } from '@nestjs/common';

import { previousWeek } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { BEST_OF_WEEK } from '../config/best-of-week.constants';
import { publicReplayWhere } from '../lib/replay-search/replay-search';

@Injectable()
export class BestOfWeekAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async feature(now: Date): Promise<number> {
    const { start, end } = previousWeek(now);
    const candidates = await this.prisma.replay.findMany({
      where: { ...publicReplayWhere, playedAt: { gte: start, lt: end }, damageDealt: { not: null } },
      orderBy: { damageDealt: 'desc' },
      take: BEST_OF_WEEK.candidates,
      select: { id: true, accountId: true, uploader: { select: { lestaAccounts: { select: { accountId: true } } } } }
    });

    const top = candidates
      .filter(({ accountId, uploader }) => accountId !== null && (uploader?.lestaAccounts ?? []).some((link) => link.accountId === accountId))
      .slice(0, BEST_OF_WEEK.size);

    if (top.length === 0) {
      return 0;
    }

    const { count } = await this.prisma.replay.updateMany({ where: { id: { in: top.map((row) => row.id) } }, data: { isFeatured: true } });

    return count;
  }
}
