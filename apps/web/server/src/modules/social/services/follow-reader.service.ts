import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { FollowCircle, FollowView } from '../social.types';

import { PrismaService, UserLestaAccountsService } from '../../../core';
import { toFollowView } from '../mappers/follow-view.mappers';

@Injectable()
export class FollowReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: UserLestaAccountsService
  ) {}

  async list(userId: string): Promise<FollowView[]> {
    const follows = await this.prisma.follow.findMany({ where: { userId, isFollowing: true }, orderBy: { createdAt: 'desc' } });
    const players = await this.prisma.player.findMany({
      where: { accountId: { in: follows.filter((follow) => follow.kind === 'player').map((follow) => follow.targetId) } },
      select: { accountId: true, nickname: true }
    });

    const nicknames = new Map(players.map((player) => [player.accountId, player.nickname]));

    return follows.map((follow) => toFollowView({ follow, nickname: nicknames.get(follow.targetId) ?? null }));
  }

  async circle(userId: string): Promise<FollowCircle> {
    const [follows, linked] = await Promise.all([
      this.prisma.follow.findMany({ where: { userId, kind: 'player', isFollowing: true }, select: { targetId: true } }),
      this.accounts.accountIds(userId)
    ]);

    const own = new Set(linked);
    const candidates = unique([...own, ...follows.map((follow) => follow.targetId)]);
    const hidden = await this.prisma.player.findMany({ where: { accountId: { in: candidates }, isHidden: true }, select: { accountId: true } });
    const hiddenIds = new Set(hidden.map((player) => player.accountId));

    return { accountIds: candidates.filter((accountId) => !hiddenIds.has(accountId)), own };
  }
}
