import type { TwitchPanel } from '@otmetki/schemas';
import type { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../../config';
import { PrismaService } from '../../../../core';
import { BotStatsService, isPublicUrl, playerUrl } from '../../../bot-commands';
import { TWITCH_PANEL } from '../config/panel.constants';

@Injectable()
export class TwitchPanelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly stats: BotStatsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ) {}

  async cached(channelId: string): Promise<TwitchPanel> {
    const key = `${TWITCH_PANEL.cachePrefix}${channelId}`;
    const hit = await this.cache.get<TwitchPanel>(key);

    if (hit) {
      return hit;
    }

    const panel = await this.panel(channelId);

    await this.cache.set(key, panel, TWITCH_PANEL.cacheTtlMs);

    return panel;
  }

  private async panel(channelId: string): Promise<TwitchPanel> {
    const integration = await this.prisma.streamerIntegration.findUnique({
      where: { provider_externalId: { provider: 'twitch', externalId: channelId } },
      select: {
        user: {
          select: {
            streamerProfile: { select: { accountId: true } },
            lestaAccounts: { where: { isPrimary: true }, take: 1, select: { accountId: true } }
          }
        }
      }
    });

    const accountId = integration?.user.streamerProfile?.accountId ?? integration?.user.lestaAccounts[0]?.accountId ?? null;

    if (accountId === null) {
      return { nickname: null, profileUrl: null, session: null, marks: { moe3: 0, moe2: 0, moe1: 0, closest: [] } };
    }

    const [player, session, marks] = await Promise.all([
      this.prisma.player.findUnique({ where: { accountId }, select: { nickname: true } }),
      this.stats.session(accountId),
      this.stats.marks(accountId)
    ]);

    const profileUrl = player ? playerUrl({ webUrl: this.config.get('WEB_URL'), nickname: player.nickname }) : null;

    return {
      nickname: player?.nickname ?? null,
      profileUrl: profileUrl && isPublicUrl(profileUrl) ? profileUrl : null,
      session: session && { ...session, startedAt: session.startedAt.toISOString() },
      marks
    };
  }
}
