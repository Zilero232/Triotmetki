import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { AccountOfInput } from '../community-core.types';
import type { PlayerStats } from '../lib/requirements/requirements.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { toPlayerStats } from '../mappers/community-views.mappers';

@Injectable()
export class CommunityAccountsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: UserAccountsReaderService
  ) {}

  async accountOf({ userId, accountId }: AccountOfInput): Promise<bigint> {
    const linked = await this.accounts.accountIds(userId);
    const account = accountId === undefined ? linked[0] : linked.find((candidate) => candidate === BigInt(accountId));

    if (account === undefined) {
      throw new AppForbiddenException('FORBIDDEN', 'Link this game account with Lesta ID first');
    }

    return account;
  }

  async statsOf(accountIds: readonly bigint[]): Promise<Map<bigint, PlayerStats>> {
    const ids = unique(accountIds);
    const ratings =
      ids.length === 0
        ? []
        : await this.prisma.accountRating.findMany({
            where: { accountId: { in: ids }, period: 'overall', player: { isHidden: false } },
            select: { accountId: true, battles: true, wn8: true, winRate: true }
          });

    return new Map(
      ratings.flatMap((rating) => {
        const stats = toPlayerStats(rating);

        return stats ? [[rating.accountId, stats] as const] : [];
      })
    );
  }

  async nicknamesOf(accountIds: readonly bigint[]): Promise<Map<bigint, string>> {
    const ids = unique(accountIds);
    const players =
      ids.length === 0
        ? []
        : await this.prisma.player.findMany({ where: { accountId: { in: ids }, isHidden: false }, select: { accountId: true, nickname: true } });

    return new Map(players.map((player) => [player.accountId, player.nickname]));
  }
}
