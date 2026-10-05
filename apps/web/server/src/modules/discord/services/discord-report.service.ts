import { API } from '@discordjs/core';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { errorMessage, formatPercentOr } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { resolveBotLocale } from '../../bot-commands';
import { OfficerReportService } from '../../clan-workspace';
import { DISCORD_TOKENS } from '../config/tokens.constants';
import { DiscordCopyService } from './discord-copy.service';

@Injectable()
export class DiscordReportService {
  private readonly logger = new Logger(DiscordReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly reports: OfficerReportService,
    private readonly copy: DiscordCopyService,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  async sendWeekly(now: Date): Promise<number> {
    if (!this.api) {
      return 0;
    }

    const guilds = await this.prisma.discordGuild.findMany({ where: { reportChannelId: { not: null } } });
    let sent = 0;

    for (const guild of guilds) {
      if (!guild.reportChannelId || !(await this.entitlements.isPlus(guild.boundByUserId))) {
        continue;
      }

      try {
        const [report, clan] = await Promise.all([
          this.reports.build({ clanId: guild.clanId, now }),
          this.prisma.clan.findUnique({ where: { clanId: guild.clanId }, select: { tag: true } })
        ]);

        const locale = resolveBotLocale(guild.locale);
        const missing = this.copy.t({ locale, key: 'missing' });
        const content = this.copy.t({
          locale,
          key: 'report',
          vars: {
            tag: clan?.tag ?? String(guild.clanId),
            events: report.events,
            attendance: formatPercentOr({ value: report.attendanceRate, locale, digits: 0, missing }),
            candidates: report.newCandidates,
            inactive: report.inactiveMembers
          }
        });

        await this.api.channels.createMessage(guild.reportChannelId, { content });
        sent += 1;
      } catch (error) {
        this.logger.warn(`discord weekly report to ${guild.guildId} failed: ${errorMessage(error)}`);
      }
    }

    return sent;
  }
}
