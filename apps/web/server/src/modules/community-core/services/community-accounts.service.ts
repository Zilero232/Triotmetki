import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { AccountOfInput } from '../community-core.types';
import type { PlayerStats } from '../lib';

import { AppForbiddenException } from '../../../common/exceptions';
import { PrismaService, USER_LESTA_ACCOUNT_ORDER } from '../../../core';
import { toPlayerStats } from '../mappers';

@Injectable()
export class CommunityAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async accountOf({ userId, accountId }: AccountOfInput): Promise<bigint> {
    const links = await this.prisma.userLestaAccount.findMany({
      where: { userId },
      orderBy: USER_LESTA_ACCOUNT_ORDER,
      select: { accountId: true }
    });

    const link = accountId === undefined ? links[0] : links.find((candidate) => candidate.accountId === BigInt(accountId));

    if (!link) {
      throw new AppForbiddenException('FORBIDDEN', 'Link this game account with Lesta ID first');
    }

    return link.accountId;
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
