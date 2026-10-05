import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type { CreateFollowInput, FollowCircle, FollowView, RemoveFollowInput } from '../social.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { FEED } from '../config';
import { clearFollowFlag, setFollowFlag } from '../lib';
import { toFollowView } from '../mappers';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
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

  async create({ userId, kind, targetId }: CreateFollowInput): Promise<FollowView[]> {
    const count = await this.prisma.follow.count({ where: { userId, isFollowing: true } });

    if (count >= FEED.maxFollows) {
      throw new AppConflictException('CONFLICT', 'Too many follows');
    }

    if (kind === 'tank') {
      await this.assertCanWatchTank({ userId, kind, targetId });
    }

    await setFollowFlag({ prisma: this.prisma, flag: 'isFollowing', key: { userId, kind, targetId: BigInt(targetId) } });

    return this.list(userId);
  }

  async remove({ userId, id }: RemoveFollowInput): Promise<void> {
    const removed = await clearFollowFlag({ prisma: this.prisma, flag: 'isFollowing', where: { id, userId } });

    if (!removed) {
      throw new AppNotFoundException('NOT_FOUND', `No follow ${id}`);
    }
  }

  async circle(userId: string): Promise<FollowCircle> {
    const [follows, links] = await Promise.all([
      this.prisma.follow.findMany({ where: { userId, kind: 'player', isFollowing: true }, select: { targetId: true } }),
      this.prisma.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } })
    ]);

    const own = new Set(links.map((link) => link.accountId));
    const candidates = unique([...own, ...follows.map((follow) => follow.targetId)]);
    const hidden = await this.prisma.player.findMany({ where: { accountId: { in: candidates }, isHidden: true }, select: { accountId: true } });
    const hiddenIds = new Set(hidden.map((player) => player.accountId));

    return { accountIds: candidates.filter((accountId) => !hiddenIds.has(accountId)), own };
  }

  private async assertCanWatchTank({ userId, kind, targetId }: CreateFollowInput): Promise<void> {
    const [existing, watched] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { userId_kind_targetId: { userId, kind, targetId: BigInt(targetId) } },
        select: { isFollowing: true }
      }),
      this.prisma.follow.count({ where: { userId, kind, isFollowing: true } })
    ]);

    if (!existing?.isFollowing) {
      await this.entitlements.assertWithinLimit({ userId, key: 'watchedTanks', count: watched });
    }
  }
}
