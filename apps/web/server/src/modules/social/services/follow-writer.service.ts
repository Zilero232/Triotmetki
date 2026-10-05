import { Injectable } from '@nestjs/common';

import type { CreateFollowInput, FollowView, RemoveFollowInput } from '../social.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { FEED } from '../config/feed.constants';
import { clearFollowFlag, setFollowFlag } from '../lib/follow-flags/follow-flags';
import { FollowReaderService } from './follow-reader.service';

@Injectable()
export class FollowWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly reader: FollowReaderService
  ) {}

  async create({ userId, kind, targetId }: CreateFollowInput): Promise<FollowView[]> {
    const count = await this.prisma.follow.count({ where: { userId, isFollowing: true } });

    if (count >= FEED.maxFollows) {
      throw new AppConflictException('CONFLICT', 'Too many follows');
    }

    if (kind === 'tank') {
      await this.assertCanWatchTank({ userId, kind, targetId });
    }

    await setFollowFlag({ prisma: this.prisma, flag: 'isFollowing', key: { userId, kind, targetId: BigInt(targetId) } });

    return this.reader.list(userId);
  }

  async remove({ userId, id }: RemoveFollowInput): Promise<void> {
    const removed = await clearFollowFlag({ prisma: this.prisma, flag: 'isFollowing', where: { id, userId } });

    if (!removed) {
      throw new AppNotFoundException('NOT_FOUND', `No follow ${id}`);
    }
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
