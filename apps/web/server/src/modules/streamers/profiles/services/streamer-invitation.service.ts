import type { StreamerInvitation as InvitationView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { AppNotFoundException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { STREAMER_INVITATIONS } from '../config/directory.constants';
import { toInvitationView } from '../mappers/invitation.mappers';

@Injectable()
export class StreamerInvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<number> {
    await this.prisma.streamerInvitation.createMany({
      data: STREAMER_INVITATIONS.map(({ slug, displayName, sourceUrl, channels }) => ({ slug, displayName, sourceUrl, channels: [...channels] })),
      skipDuplicates: true
    });

    return STREAMER_INVITATIONS.length;
  }

  async list(): Promise<InvitationView[]> {
    const rows = await this.prisma.streamerInvitation.findMany({ orderBy: { createdAt: 'asc' } });

    return rows.map(toInvitationView);
  }

  async markSent(slug: string): Promise<void> {
    const updated = await this.prisma.streamerInvitation.updateMany({
      where: { slug, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() }
    });

    if (updated.count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No pending invitation ${slug}`);
    }
  }
}
