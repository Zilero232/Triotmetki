import { Injectable } from '@nestjs/common';
import { subHours, subMinutes } from 'date-fns';

import { winRateShare } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { isSessionEnded } from '../../developer';
import { SESSION_REPORT } from '../config/watchers.constants';
import { sessionReportKey } from '../lib/session-report-key';
import { NotificationService } from './notification.service';

@Injectable()
export class SessionReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService
  ) {}

  async run(now = new Date()): Promise<number> {
    const idleSince = subMinutes(now, SESSION_REPORT.idleMinutes);

    const candidates = await this.prisma.playSession.findMany({
      where: {
        source: 'mod',
        kind: 'live',
        reportSentAt: null,
        battles: { gt: 0 },
        lastActivityAt: { gt: subHours(now, SESSION_REPORT.maxAgeHours) },
        OR: [{ lastActivityAt: { lt: idleSince } }, { player: { logoutAt: { not: null } } }]
      },
      orderBy: { lastActivityAt: 'asc' },
      take: SESSION_REPORT.batchSize,
      select: {
        id: true,
        accountId: true,
        battles: true,
        wins: true,
        damageDealt: true,
        wn8: true,
        lastActivityAt: true,
        player: { select: { nickname: true, logoutAt: true } }
      }
    });

    const sessions = candidates.filter((session) =>
      isSessionEnded({ lastActivityAt: session.lastActivityAt, logoutAt: session.player.logoutAt, idleSince })
    );

    let reported = 0;

    for (const session of sessions) {
      const claimed = await this.prisma.playSession.updateMany({ where: { id: session.id, reportSentAt: null }, data: { reportSentAt: now } });

      if (claimed.count === 0) {
        continue;
      }

      const owners = await this.prisma.userLestaAccount.findMany({ where: { accountId: session.accountId }, select: { userId: true } });

      reported += await this.notifications.notifyMany({
        userIds: owners.map((owner) => owner.userId),
        notification: {
          event: 'sessionFinished',
          accountId: Number(session.accountId),
          nickname: session.player.nickname,
          sessionId: session.id,
          battles: session.battles,
          winRate: winRateShare({ wins: session.wins, battles: session.battles }) ?? 0,
          avgDamage: session.damageDealt / session.battles,
          wn8: session.wn8
        },
        dedupeKey: sessionReportKey(session.id)
      });
    }

    return reported;
  }
}
