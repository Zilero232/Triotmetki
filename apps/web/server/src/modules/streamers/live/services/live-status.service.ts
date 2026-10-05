import { Injectable, Logger } from '@nestjs/common';
import { subMilliseconds } from 'date-fns';

import type { StreamerProfile } from '../../../../../generated';
import type { LiveStream } from '../lib/live-status';
import type { SafePollInput } from '../live.types';

import { errorMessage } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { NotificationService } from '../../../notifications';
import { LIVE } from '../config/live.constants';
import { mergeLiveStatus, wentLive } from '../lib/live-status';
import { LivePlatformsService } from './live-platforms.service';

@Injectable()
export class LiveStatusService {
  private readonly logger = new Logger(LiveStatusService.name);
  private youtubeCheckedAt = 0;
  private youtubeStreams: LiveStream[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly platforms: LivePlatformsService,
    private readonly notifications: NotificationService
  ) {}

  async poll(): Promise<number> {
    const profiles = await this.prisma.streamerProfile.findMany({
      where: { hiddenAt: null, kind: 'claimed', channels: { some: { platform: { in: ['twitch', 'vkVideoLive', 'youtube'] } } } },
      include: { channels: true }
    });

    if (profiles.length === 0) {
      return 0;
    }

    const handles = (platform: string) =>
      profiles.flatMap((profile) => profile.channels.filter((channel) => channel.platform === platform).map((channel) => channel.handle));

    const streams = [
      ...(await this.safe({ platform: 'twitch', run: () => this.platforms.twitchStreams(handles('twitch')) })),
      ...(await this.safe({ platform: 'vk', run: () => this.platforms.vkStreams(handles('vkVideoLive')) })),
      ...(await this.youtube(handles('youtube').filter((handle) => handle.startsWith('UC'))))
    ];

    const now = new Date();
    let changed = 0;

    for (const profile of profiles) {
      const state = mergeLiveStatus({ channels: profile.channels, streams });
      const liveTankId = state.isLive ? await this.liveTank(profile) : null;
      const isNewStream = wentLive({ wasLive: profile.isLive, isLive: state.isLive });

      const updated = await this.prisma.streamerProfile.update({
        where: { id: profile.id },
        data: {
          isLive: state.isLive,
          livePlatform: state.platform,
          liveViewers: state.viewers,
          liveTankId,
          liveCheckedAt: now,
          ...(isNewStream ? { liveStartedAt: now } : {}),
          ...(state.isLive ? {} : { liveStartedAt: null })
        }
      });

      if (state.isLive) {
        await this.alert(updated);
      }

      if (profile.isLive !== state.isLive || profile.liveTankId !== liveTankId) {
        changed += 1;
      }
    }

    return changed;
  }

  private async liveTank(profile: StreamerProfile): Promise<number | null> {
    if (profile.accountId === null) {
      return null;
    }

    const battle = await this.prisma.battle.findFirst({
      where: { accountId: profile.accountId, startedAt: { gte: subMilliseconds(new Date(), LIVE.tankWindowMs) } },
      orderBy: { startedAt: 'desc' },
      select: { tankId: true }
    });

    return battle?.tankId ?? null;
  }

  private async alert(profile: StreamerProfile): Promise<void> {
    const streamKey = `${LIVE.alertDedupePrefix}:${profile.id}:${profile.liveStartedAt?.getTime() ?? 0}`;
    const follows = await this.prisma.streamerFollow.findMany({ where: { profileId: profile.id } });
    const due = follows.filter((follow) => {
      const key = follow.tankId ? `${streamKey}:${follow.tankId}` : streamKey;

      return follow.lastAlertKey !== key && (follow.tankId === null || follow.tankId === profile.liveTankId);
    });

    if (due.length === 0) {
      return;
    }

    const tank = profile.liveTankId ? await this.prisma.vehicle.findUnique({ where: { tankId: profile.liveTankId }, select: { name: true } }) : null;

    for (const follow of due) {
      const key = follow.tankId ? `${streamKey}:${follow.tankId}` : streamKey;

      await this.notifications.notify({
        userId: follow.userId,
        dedupeKey: key,
        notification: {
          event: 'streamerLive',
          slug: profile.slug,
          displayName: profile.displayName,
          platform: profile.livePlatform ?? 'twitch',
          tankName: follow.tankId ? (tank?.name ?? null) : null
        }
      });

      await this.prisma.streamerFollow.update({
        where: { userId_profileId: { userId: follow.userId, profileId: follow.profileId } },
        data: { lastAlertKey: key }
      });
    }
  }

  private async youtube(channelIds: readonly string[]): Promise<LiveStream[]> {
    if (Date.now() - this.youtubeCheckedAt < LIVE.youtube.pollEveryMs) {
      return this.youtubeStreams;
    }

    this.youtubeCheckedAt = Date.now();
    this.youtubeStreams = await this.safe({ platform: 'youtube', run: () => this.platforms.youtubeLive(channelIds) });

    return this.youtubeStreams;
  }

  private async safe({ platform, run }: SafePollInput): Promise<LiveStream[]> {
    try {
      return await run();
    } catch (error) {
      this.logger.warn(`${platform} live poll failed: ${errorMessage(error)}`);

      return [];
    }
  }
}
