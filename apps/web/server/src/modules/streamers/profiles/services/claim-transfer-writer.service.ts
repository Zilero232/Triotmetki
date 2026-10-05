import { Injectable } from '@nestjs/common';

import type { StreamerClaim } from '../../../../../generated';
import type { CompleteClaimInput } from '../profiles.types';

import { Prisma } from '../../../../../generated';
import { toJsonValue } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { invitationChannelsSchema } from '../dto/profiles.schemas';
import { StreamerProfileService } from './streamer-profile.service';

@Injectable()
export class ClaimTransferWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileService
  ) {}

  async complete({ claim, verifiedPlatform, moderatorId }: CompleteClaimInput): Promise<StreamerClaim> {
    const own = await this.prisma.streamerProfile.findUnique({ where: { userId: claim.userId } });
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      if (claim.invitationId) {
        const invitation = await tx.streamerInvitation.update({ where: { id: claim.invitationId }, data: { status: 'accepted' } });
        const profile =
          own ?? (await tx.streamerProfile.create({ data: { userId: claim.userId, slug: invitation.slug, displayName: invitation.displayName } }));

        return { id: profile.id, channels: invitationChannelsSchema.parse(invitation.channels) };
      }

      const target = await tx.streamerProfile.findUniqueOrThrow({ where: { id: claim.profileId ?? '' } });

      if (!own) {
        await tx.streamerProfile.update({ where: { id: target.id }, data: { userId: claim.userId, kind: 'claimed' } });

        return { id: target.id, channels: [] };
      }

      const movesSettings = own.settings === null && target.settings !== null;

      await tx.streamerChannel.updateMany({ where: { profileId: target.id }, data: { profileId: own.id } });

      await tx.streamerProfile.update({
        where: { id: target.id },
        data: { hiddenAt: now, mergedIntoId: own.id, ...(movesSettings ? { settings: Prisma.DbNull, settingsUpdatedAt: null } : {}) }
      });

      if (movesSettings) {
        await tx.streamerProfile.update({
          where: { id: own.id },
          data: { settings: toJsonValue(target.settings), settingsUpdatedAt: target.settingsUpdatedAt }
        });
      }

      return { id: own.id, channels: [] };
    });

    if (result.channels.length > 0) {
      const existing = await this.prisma.streamerChannel.findMany({ where: { profileId: result.id } });

      await this.profiles.replaceChannels({
        profileId: result.id,
        channels: [...existing.map((channel) => ({ platform: channel.platform, url: channel.url })), ...result.channels]
      });
    }

    if (verifiedPlatform) {
      await this.prisma.streamerChannel.updateMany({ where: { profileId: result.id, platform: verifiedPlatform }, data: { verifiedAt: now } });
    }

    return this.prisma.streamerClaim.update({
      where: { id: claim.id },
      data: { status: 'resolved', resolvedAt: now, resolvedBy: moderatorId, profileId: result.id }
    });
  }
}
