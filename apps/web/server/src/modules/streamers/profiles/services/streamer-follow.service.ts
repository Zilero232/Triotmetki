import type { StreamerFollow } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { FollowInput, SlugOwnerInput } from '../profiles.types';

import { AppForbiddenException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { EntitlementsService } from '../../../billing';
import { toStreamerFollowView } from '../mappers/streamer-follow.mappers';
import { StreamerProfileService } from './streamer-profile.service';

@Injectable()
export class StreamerFollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileService,
    private readonly entitlements: EntitlementsService
  ) {}

  async list(userId: string): Promise<StreamerFollow[]> {
    const follows = await this.prisma.streamerFollow.findMany({
      where: { userId, profile: { hiddenAt: null } },
      include: { profile: { select: { slug: true, displayName: true, isLive: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return follows.map(toStreamerFollowView);
  }

  async follow({ userId, slug, tankId }: FollowInput): Promise<StreamerFollow[]> {
    const profile = await this.profiles.publicBySlug(slug);

    if (profile.userId === userId) {
      throw new AppForbiddenException('FORBIDDEN', 'You cannot follow your own page');
    }

    if (tankId) {
      await this.entitlements.assertFeature({ userId, feature: 'streamerAlerts' });
    }

    const existing = await this.prisma.streamerFollow.findUnique({ where: { userId_profileId: { userId, profileId: profile.id } } });

    if (!existing) {
      const count = await this.prisma.streamerFollow.count({ where: { userId } });

      await this.entitlements.assertWithinLimit({ userId, key: 'streamerFollows', count, feature: 'streamerAlerts' });
    }

    await this.prisma.streamerFollow.upsert({
      where: { userId_profileId: { userId, profileId: profile.id } },
      create: { userId, profileId: profile.id, tankId: tankId ?? null },
      update: { tankId: tankId ?? null }
    });

    return this.list(userId);
  }

  async unfollow({ userId, slug }: SlugOwnerInput): Promise<void> {
    const profile = await this.profiles.publicBySlug(slug);

    await this.prisma.streamerFollow.deleteMany({ where: { userId, profileId: profile.id } });
  }
}
