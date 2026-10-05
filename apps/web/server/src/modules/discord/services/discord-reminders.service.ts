import { API } from '@discordjs/core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getUnixTime, subMinutes } from 'date-fns';
import { Redis } from 'ioredis';
import { unique } from 'remeda';

import { errorMessage } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { resolveBotLocale } from '../../bot-commands';
import { DISCORD_LIMITS } from '../config/queue.constants';
import { DISCORD_TOKENS } from '../config/tokens.constants';
import { DiscordCopyService } from './discord-copy.service';

@Injectable()
export class DiscordRemindersService {
  private readonly logger = new Logger(DiscordRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly copy: DiscordCopyService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  async send(now: Date): Promise<number> {
    if (!this.api) {
      return 0;
    }

    const guilds = await this.prisma.discordGuild.findMany({ where: { channelId: { not: null } } });

    if (guilds.length === 0) {
      return 0;
    }

    const events = await this.prisma.clanEvent.findMany({
      where: {
        clanId: { in: unique(guilds.map((guild) => guild.clanId)) },
        remindAt: { lte: now, gt: subMinutes(now, DISCORD_LIMITS.reminderWindowMinutes) },
        startsAt: { gt: now }
      },
      include: { workspace: { select: { clan: { select: { tag: true } } } } }
    });

    let sent = 0;

    for (const event of events) {
      for (const guild of guilds) {
        if (guild.clanId !== event.clanId || !guild.channelId) {
          continue;
        }

        const claim = `${DISCORD_LIMITS.reminderClaimPrefix}${guild.guildId}:${event.id}`;

        if ((await this.redis.set(claim, '1', 'EX', DISCORD_LIMITS.reminderClaimSeconds, 'NX')) !== 'OK') {
          continue;
        }

        const content = this.copy.t({
          locale: resolveBotLocale(guild.locale),
          key: 'reminder',
          vars: { tag: event.workspace.clan.tag, title: event.title, startsAt: `<t:${getUnixTime(event.startsAt)}:R>` }
        });

        try {
          await this.api.channels.createMessage(guild.channelId, { content });
          sent += 1;
        } catch (error) {
          this.logger.warn(`discord reminder to ${guild.guildId} failed: ${errorMessage(error)}`);
        }
      }
    }

    return sent;
  }
}
