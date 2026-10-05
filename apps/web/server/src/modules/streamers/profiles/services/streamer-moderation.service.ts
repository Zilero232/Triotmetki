import type { EditorialStreamerInput } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { RemovalRequestInput } from '../profiles.types';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { REMOVAL_REPORT, STREAMERS } from '../config/directory.constants';
import { StreamerProfileService } from './streamer-profile.service';

@Injectable()
export class StreamerModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileService
  ) {}

  async requestRemoval({ slug, contact, reason, userId }: RemovalRequestInput): Promise<void> {
    const profile = await this.profiles.publicBySlug(slug);

    await this.prisma.contentReport.create({
      data: {
        reporterUserId: userId,
        targetType: REMOVAL_REPORT.targetType,
        targetId: profile.id,
        reason: reason ?? REMOVAL_REPORT.reason,
        details: contact
      }
    });
  }

  async hide(slug: string): Promise<void> {
    const profile = await this.prisma.streamerProfile.findUnique({ where: { slug } });

    if (!profile) {
      throw new AppNotFoundException('NOT_FOUND', `No streamer ${slug}`);
    }

    await this.prisma.$transaction([
      this.prisma.streamerProfile.update({ where: { id: profile.id }, data: { hiddenAt: new Date(), isLive: false } }),
      this.prisma.contentReport.updateMany({
        where: { targetType: REMOVAL_REPORT.targetType, targetId: profile.id, status: 'open' },
        data: { status: 'resolved', resolvedAt: new Date() }
      })
    ]);
  }

  async createEditorial({ slug, displayName, channels }: EditorialStreamerInput): Promise<void> {
    if (!STREAMERS.editorialEnabled) {
      throw new AppForbiddenException('FORBIDDEN', 'Editorial entries are disabled until the legal review');
    }

    const taken = await this.prisma.streamerProfile.count({ where: { slug } });

    if (taken > 0) {
      throw new AppConflictException('STREAMER_SLUG_TAKEN', `The slug ${slug} is taken`);
    }

    const profile = await this.prisma.streamerProfile.create({ data: { slug, displayName, kind: 'editorial' } });

    await this.profiles.replaceChannels({ profileId: profile.id, channels });
  }
}
