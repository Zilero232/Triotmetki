import { tz } from '@date-fns/tz';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { format, subDays } from 'date-fns';

import type { Digest, DigestPayload } from '../config/notifications-queue.types';
import type { DigestOfInput } from '../notifications.types';

import { TIME } from '../../../config';
import { PrismaService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';
import { WEEKLY_DIGEST } from '../config/watchers.constants';

@Injectable()
export class WeeklyDigestService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE.deliver) private readonly queue: Queue<DigestPayload>,
    private readonly accounts: UserAccountsReaderService
  ) {}

  async run(now = new Date()): Promise<number> {
    const since = subDays(now, WEEKLY_DIGEST.lookbackDays);
    const weekKey = format(now, WEEKLY_DIGEST.weekKeyFormat, { in: tz(TIME.zone) });
    let cursor: string | undefined;
    let queued = 0;

    for (;;) {
      const page = await this.prisma.notificationSettings.findMany({
        where: { weeklyDigest: true, ...(cursor ? { userId: { gt: cursor } } : {}) },
        orderBy: { userId: 'asc' },
        take: WEEKLY_DIGEST.batchSize,
        select: { userId: true }
      });

      for (const { userId } of page) {
        const digest = await this.digestOf({ userId, since });

        await this.queue.add(NOTIFICATIONS_JOB.deliver.digest, { userId, weekKey, digest }, { jobId: `digest__${userId}__${weekKey}` });
        queued += 1;
      }

      cursor = page.at(-1)?.userId;

      if (page.length < WEEKLY_DIGEST.batchSize) {
        return queued;
      }
    }
  }

  async digestOf({ userId, since }: DigestOfInput): Promise<Digest> {
    const accountIds = await this.accounts.accountIds(userId);

    const [sessions, marks] = await Promise.all([
      this.prisma.playSession.aggregate({
        where: { accountId: { in: accountIds }, startedAt: { gte: since } },
        _sum: { battles: true, wins: true, damageDealt: true },
        _count: { _all: true }
      }),
      this.prisma.notification.findMany({
        where: { userId, event: 'moeGained', createdAt: { gte: since }, payload: { path: ['isFollowed'], equals: false } },
        distinct: ['dedupeKey'],
        select: { id: true }
      })
    ]);

    return {
      battles: sessions._sum.battles ?? 0,
      wins: sessions._sum.wins ?? 0,
      damageDealt: sessions._sum.damageDealt ?? 0,
      sessions: sessions._count._all,
      marksGained: marks.length
    };
  }
}
