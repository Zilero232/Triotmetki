import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { FirstWinRemindInput } from '../notifications.types';

import { isoDay } from '../../../common/lib';
import { PrismaService, USER_LESTA_ACCOUNT_ORDER } from '../../../core';
import { dailyWindow, FirstWinService } from '../../analytics';
import { FIRST_WIN_REMINDER } from '../config/watchers.constants';
import { NotificationService } from './notification.service';

@Injectable()
export class FirstWinRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firstWin: FirstWinService,
    private readonly notifications: NotificationService
  ) {}

  async run(now = new Date()): Promise<number> {
    const { resetAt } = dailyWindow(now);
    let sent = 0;
    let cursor: string | undefined;

    do {
      const page = await this.prisma.notificationSettings.findMany({
        where: { events: { has: 'firstWinAvailable' }, ...(cursor ? { userId: { gt: cursor } } : {}) },
        orderBy: { userId: 'asc' },
        take: FIRST_WIN_REMINDER.batchSize,
        select: { userId: true }
      });

      for (const { userId } of page) {
        sent += await this.remind({ userId, now, resetAt });
      }

      cursor = page.length === FIRST_WIN_REMINDER.batchSize ? page.at(-1)?.userId : undefined;
    } while (cursor);

    return sent;
  }

  private async remind({ userId, now, resetAt }: FirstWinRemindInput): Promise<number> {
    const link = await this.prisma.userLestaAccount.findFirst({
      where: { userId, player: { lastBattleAt: { gte: subDays(now, FIRST_WIN_REMINDER.activeWithinDays) } } },
      orderBy: USER_LESTA_ACCOUNT_ORDER,
      select: { accountId: true, player: { select: { nickname: true } } }
    });

    if (!link) {
      return 0;
    }

    const available = await this.firstWin.availableCount({ accountId: link.accountId, since: resetAt });

    if (available === 0) {
      return 0;
    }

    return this.notifications.notifyMany({
      userIds: [userId],
      notification: { event: 'firstWinAvailable', accountId: Number(link.accountId), nickname: link.player.nickname, available },
      dedupeKey: `first-win-${link.accountId}-${isoDay(resetAt)}`
    });
  }
}
