import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { match } from 'ts-pattern';

import type { SessionSharePayload } from '../config/session-share-queue.types';
import type { SendDiscordOnceInput } from '../session-share.types';

import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { DiscordSenderService } from '../../discord';
import { NotificationLedgerService, renderNotification, resolveNotificationLocale, sessionReportKey } from '../../notifications';
import { TelegramSenderService } from '../../telegram';
import { SESSION_SHARE } from '../config/session-share.constants';
import { toSessionCard } from '../mappers/session-card.mappers';
import { SESSION_CARD_SELECT, SHARE_RECIPIENT_SELECT } from '../selects/session-share.selects';

@Injectable()
export class SessionShareDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly telegram: TelegramSenderService,
    private readonly discord: DiscordSenderService,
    private readonly ledger: NotificationLedgerService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async deliver({ userId, sessionId, channel }: SessionSharePayload): Promise<boolean> {
    const [recipient, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: SHARE_RECIPIENT_SELECT }),
      this.prisma.playSession.findUnique({ where: { id: sessionId }, select: SESSION_CARD_SELECT })
    ]);

    const card = session ? toSessionCard(session) : null;

    if (!recipient || !session || !card) {
      return false;
    }

    const owns = await this.prisma.userLestaAccount.count({ where: { userId, accountId: session.accountId } });

    if (owns === 0) {
      return false;
    }

    const locale = resolveNotificationLocale(recipient.locale);
    const rendered = renderNotification({ notification: card, locale, webUrl: this.config.get('WEB_URL') });
    const telegramId = recipient.telegramAccount?.telegramId ?? null;
    const discordUserId = recipient.accounts[0]?.accountId ?? null;

    return match(channel)
      .with('telegram', async () => {
        if (telegramId === null || !this.telegram.isEnabled) {
          return false;
        }

        await this.ledger.sendOnce({
          userId,
          channel: 'telegram',
          dedupeKey: sessionReportKey(sessionId),
          notification: card,
          rendered,
          send: () => this.telegram.sendNotification({ telegramId, locale, ...rendered })
        });

        return true;
      })
      .with('discord', async () => {
        if (discordUserId === null || !this.discord.isEnabled) {
          return false;
        }

        await this.sendDiscordOnce({
          key: `${SESSION_SHARE.discordSentPrefix}${userId}:${sessionId}`,
          send: () => this.discord.sendDirect({ discordUserId, ...rendered })
        });

        return true;
      })
      .exhaustive();
  }

  private async sendDiscordOnce({ key, send }: SendDiscordOnceInput): Promise<void> {
    const claimed = await this.redis.set(key, SESSION_SHARE.discordSentMarker, 'EX', SESSION_SHARE.discordSentTtlSeconds, 'NX');

    if (claimed === null) {
      return;
    }

    try {
      await send();
    } catch (error) {
      await this.redis.del(key);

      throw error;
    }
  }
}
