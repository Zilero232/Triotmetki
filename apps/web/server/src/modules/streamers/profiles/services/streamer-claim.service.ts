import type { AdminClaim, StreamerClaim as StreamerClaimView } from '@otmetki/schemas';

import { Injectable, Logger } from '@nestjs/common';
import { isIncludedIn } from 'remeda';
import { match } from 'ts-pattern';

import type { ParsedChannel } from '../lib/channel-url';
import type { ClaimRef, ClaimTarget, ContestedClaimInput, ResolveClaimRequest, StartClaimRequest } from '../profiles.types';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { errorMessage } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { readIntegrationConfig } from '../../integrations';
import { LivePlatformsService } from '../../live';
import { CLAIM, CLAIM_METHOD_TO_DB } from '../config/claims.constants';
import { STREAMERS } from '../config/directory.constants';
import { invitationChannelsSchema } from '../dto/profiles.schemas';
import { parseChannel } from '../lib/channel-url';
import { bioHasCode, newClaimCode } from '../lib/claim-code';
import { toAdminClaim, toClaimView } from '../mappers/claim.mappers';
import { ClaimTransferWriterService } from './claim-transfer-writer.service';

@Injectable()
export class StreamerClaimService {
  private readonly logger = new Logger(StreamerClaimService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transfer: ClaimTransferWriterService,
    private readonly platforms: LivePlatformsService
  ) {}

  async start({ userId, slug, method, platform, evidence }: StartClaimRequest): Promise<StreamerClaimView> {
    const target = await this.target(slug);
    const channels = await this.channelsOf(target);

    if (method === 'oauth') {
      const integration = await this.prisma.streamerIntegration.findUnique({ where: { userId_provider: { userId, provider: 'twitch' } } });
      const login = readIntegrationConfig(integration?.config).login?.toLowerCase();
      const owns = login !== undefined && channels.some((channel) => channel.platform === 'twitch' && channel.handle === login);

      if (!owns) {
        throw new AppForbiddenException('FORBIDDEN', 'The connected Twitch channel is not on this page');
      }

      const claim = await this.prisma.streamerClaim.create({
        data: { ...this.targetRef(target), userId, method: CLAIM_METHOD_TO_DB[method], platform: 'twitch' }
      });

      if (await this.contested({ target, userId, login })) {
        return toClaimView({ claim, slug });
      }

      return toClaimView({ claim: await this.transfer.complete({ claim, verifiedPlatform: 'twitch', moderatorId: null }), slug });
    }

    const claim = await this.prisma.streamerClaim.create({
      data: {
        ...this.targetRef(target),
        userId,
        method: CLAIM_METHOD_TO_DB[method],
        platform: platform ?? null,
        code: method === 'bio_code' ? newClaimCode() : null,
        evidence: evidence ?? null
      }
    });

    return toClaimView({ claim, slug });
  }

  async verify({ userId, slug }: ClaimRef): Promise<StreamerClaimView> {
    const target = await this.target(slug);
    const claim = await this.prisma.streamerClaim.findFirst({
      where: { ...this.targetRef(target), userId, method: CLAIM_METHOD_TO_DB.bio_code, status: 'open' },
      orderBy: { createdAt: 'desc' }
    });

    if (!claim?.code) {
      throw new AppNotFoundException('NOT_FOUND', 'No open code claim');
    }

    const channels = (await this.channelsOf(target)).filter((channel) => isIncludedIn(channel.platform, CLAIM.bioPlatforms));

    for (const channel of channels) {
      const bio = await this.description(channel);

      if (bioHasCode({ bio, code: claim.code })) {
        return toClaimView({ claim: await this.transfer.complete({ claim, verifiedPlatform: channel.platform, moderatorId: null }), slug });
      }
    }

    return toClaimView({ claim, slug });
  }

  async mine({ userId, slug }: ClaimRef): Promise<StreamerClaimView | null> {
    const target = await this.target(slug);
    const claim = await this.prisma.streamerClaim.findFirst({ where: { ...this.targetRef(target), userId }, orderBy: { createdAt: 'desc' } });

    return claim ? toClaimView({ claim, slug }) : null;
  }

  async pending(): Promise<AdminClaim[]> {
    const claims = await this.prisma.streamerClaim.findMany({
      where: { status: 'open' },
      include: { profile: { select: { slug: true } }, invitation: { select: { slug: true } } },
      orderBy: { createdAt: 'asc' }
    });

    return claims.map(toAdminClaim);
  }

  async resolve({ id, approve, moderatorId }: ResolveClaimRequest): Promise<void> {
    const claim = await this.prisma.streamerClaim.findUnique({ where: { id } });

    if (claim?.status !== 'open') {
      throw new AppNotFoundException('NOT_FOUND', `No open claim ${id}`);
    }

    if (approve) {
      await this.transfer.complete({ claim, verifiedPlatform: null, moderatorId });

      return;
    }

    await this.prisma.streamerClaim.update({ where: { id }, data: { status: 'dismissed', resolvedAt: new Date(), resolvedBy: moderatorId } });
  }

  private async target(slug: string): Promise<ClaimTarget> {
    const profile = await this.prisma.streamerProfile.findUnique({ where: { slug } });

    if (profile) {
      if (profile.kind === 'claimed' || profile.hiddenAt || !STREAMERS.editorialEnabled) {
        throw new AppConflictException('CONFLICT', `${slug} cannot be claimed`);
      }

      return { profile, invitation: null };
    }

    const invitation = await this.prisma.streamerInvitation.findUnique({ where: { slug } });

    if (!invitation || invitation.status === 'accepted' || invitation.status === 'declined') {
      throw new AppNotFoundException('NOT_FOUND', `Nothing to claim at ${slug}`);
    }

    return { profile: null, invitation };
  }

  private async contested({ target, userId, login }: ContestedClaimInput): Promise<boolean> {
    const rivals = await this.prisma.streamerClaim.count({
      where: { ...this.targetRef(target), userId: { not: userId }, status: 'open', method: CLAIM_METHOD_TO_DB.oauth }
    });

    const verifiedElsewhere = await this.prisma.streamerChannel.count({
      where: { platform: 'twitch', handle: login, verifiedAt: { not: null }, ...(target.profile ? { NOT: { profileId: target.profile.id } } : {}) }
    });

    return rivals > 0 || verifiedElsewhere > 0;
  }

  private targetRef(target: ClaimTarget) {
    return target.profile ? { profileId: target.profile.id } : { invitationId: target.invitation.id };
  }

  private async channelsOf(target: ClaimTarget): Promise<ParsedChannel[]> {
    if (target.profile) {
      return this.prisma.streamerChannel.findMany({ where: { profileId: target.profile.id } });
    }

    return invitationChannelsSchema.parse(target.invitation.channels).flatMap((channel) => {
      const parsed = parseChannel(channel);

      return parsed ? [parsed] : [];
    });
  }

  private async description(channel: ParsedChannel): Promise<string | null> {
    try {
      return await match(channel.platform)
        .with('twitch', () => this.platforms.twitchDescription(channel.handle))
        .with('vkVideoLive', () => this.platforms.vkDescription(channel.handle))
        .with('youtube', () => this.platforms.youtubeDescription(channel.handle))
        .otherwise(async () => null);
    } catch (error) {
      this.logger.warn(`bio check failed for ${channel.platform}/${channel.handle}: ${errorMessage(error)}`);

      return null;
    }
  }
}
