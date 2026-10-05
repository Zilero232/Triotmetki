import { Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';

import type { NotificationLocale } from '../../../notifications';
import type { ChatReplyInput, StreamerTextInput } from '../chat.types';

import { AppConfigService } from '../../../../config';
import { PrismaService } from '../../../../core';
import { resolveNotificationLocale } from '../../../notifications';
import { CHAT_COPY, CHAT_LINKS } from '../config/chat.constants';
import { chatText, chatValue } from '../lib/chat-copy';

@Injectable()
export class StreamerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService
  ) {}

  async chatLocale(streamerUserId: string): Promise<NotificationLocale> {
    const user = await this.prisma.user.findUnique({ where: { id: streamerUserId }, select: { locale: true } });

    return resolveNotificationLocale(user?.locale);
  }

  async text({ streamerUserId, message, values }: StreamerTextInput): Promise<string> {
    return chatText({ locale: await this.chatLocale(streamerUserId), message, values });
  }

  async reply({ streamerUserId, command }: ChatReplyInput): Promise<string | null> {
    const profile = await this.prisma.streamerProfile.findUnique({
      where: { userId: streamerUserId },
      select: { slug: true, accountId: true, displayName: true, settings: true }
    });

    if (!profile) {
      return null;
    }

    if (command === 'settings') {
      const locale = await this.chatLocale(streamerUserId);

      const url = new URL(`${CHAT_LINKS.streamer}/${encodeURIComponent(profile.slug)}/${CHAT_LINKS.settings}`, this.config.get('WEB_URL')).toString();

      return chatText({
        locale,
        message: profile.settings !== null ? CHAT_COPY.messages.settings : CHAT_COPY.messages.settingsNone,
        values: { name: profile.displayName, url }
      });
    }

    const { accountId } = profile;

    if (!accountId) {
      return null;
    }

    const [locale, player] = await Promise.all([
      this.chatLocale(streamerUserId),
      this.prisma.player.findUnique({ where: { accountId }, select: { nickname: true } })
    ]);

    const nickname = player?.nickname ?? profile.displayName;

    return match(command)
      .with('stat', async () => {
        const rating = await this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId, period: 'overall' } } });

        return chatText({
          locale,
          message: CHAT_COPY.messages.stat,
          values: { nickname, wn8: chatValue(rating?.wn8), winRate: chatValue(rating?.winRate), battles: chatValue(rating?.battles) }
        });
      })
      .with('session', async () => {
        const session = await this.prisma.playSession.findFirst({ where: { accountId, battles: { gt: 0 } }, orderBy: { startedAt: 'desc' } });

        if (!session) {
          return chatText({ locale, message: CHAT_COPY.messages.sessionNone, values: { nickname } });
        }

        return chatText({
          locale,
          message: CHAT_COPY.messages.session,
          values: {
            nickname,
            battles: session.battles,
            winRate: (session.wins * 100) / session.battles,
            avgDamage: session.damageDealt / session.battles
          }
        });
      })
      .with('marks', async () => {
        const groups = await this.prisma.playerTank.groupBy({
          by: ['marksOnGun'],
          where: { accountId, marksOnGun: { gt: 0 } },
          _count: { _all: true }
        });

        const count = (marks: number) => groups.find((group) => group.marksOnGun === marks)?._count._all ?? 0;

        return chatText({ locale, message: CHAT_COPY.messages.marks, values: { nickname, moe3: count(3), moe2: count(2), moe1: count(1) } });
      })
      .exhaustive();
  }
}
