import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Follow, NotificationSettings, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { DeliverPayload } from '../../config/notifications-queue.types';

import { NOTIFICATIONS_JOB } from '../../config/notifications-queue.constants';
import { NotificationService } from '../notification.service';

const moe = { event: 'moeGained', accountId: 7, nickname: 'Tanker', tankId: 1, tankName: 'T-34', marks: 2 } as const;

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const queue = mock<Queue<DeliverPayload>>();

  return { service: new NotificationService(prisma, queue), prisma, queue };
};

const payloads = (queue: ReturnType<typeof createService>['queue']) => queue.addBulk.mock.calls.flatMap(([jobs]) => jobs.map((job) => job.data));

describe('NotificationService', () => {
  it('queues one delivery job per unique recipient with a stable job id', async () => {
    const { service, queue } = createService();

    await service.notifyMany({ userIds: ['u1', 'u1', 'u2'], notification: moe, dedupeKey: 'moe-b1' });

    const jobs = queue.addBulk.mock.calls.flatMap(([batch]) => batch);

    expect(jobs.map((job) => job.opts?.jobId)).toEqual(['u1__moe-b1', 'u2__moe-b1']);
    expect(jobs.every((job) => job.name === NOTIFICATIONS_JOB.deliver.event)).toBe(true);
  });

  it('tells the owner as the player and followers as friends', async () => {
    const { service, prisma, queue } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ userId: 'owner' })]);
    prisma.follow.findMany.mockResolvedValue([mock<Follow>({ userId: 'friend' }), mock<Follow>({ userId: 'owner' })]);

    const sent = await service.notifyAccount({ accountId: 7n, notification: moe, dedupeKey: 'moe-b1' });

    expect(sent).toBe(2);

    expect(payloads(queue)).toEqual([
      { userId: 'owner', dedupeKey: 'moe-b1', notification: moe },
      { userId: 'friend', dedupeKey: 'moe-b1', notification: { ...moe, isFollowed: true } }
    ]);
  });

  it('does not fan a session report out to followers', async () => {
    const { service, prisma, queue } = createService();
    const session = {
      event: 'sessionFinished',
      accountId: 7,
      nickname: 'Tanker',
      sessionId: 's',
      battles: 3,
      winRate: 0.5,
      avgDamage: 1000,
      wn8: 1500
    } as const;

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ userId: 'owner' })]);
    prisma.follow.findMany.mockResolvedValue([mock<Follow>({ userId: 'friend' })]);

    await service.notifyAccount({ accountId: 7n, notification: session, dedupeKey: 'session-s' });

    expect(payloads(queue).map((payload) => payload.userId)).toEqual(['owner']);
  });

  it('broadcasts a bonus code only to users who opted into the event', async () => {
    const { service, prisma, queue } = createService();

    prisma.notificationSettings.findMany.mockResolvedValue([mock<NotificationSettings>({ userId: 'fan' })]);

    await service.bonusCodePublished({ code: 'TANKS', description: null });

    expect(prisma.notificationSettings.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { events: { has: 'bonusCode' } } }));

    expect(payloads(queue)).toEqual([
      { userId: 'fan', dedupeKey: 'bonus-TANKS', notification: { event: 'bonusCode', code: 'TANKS', description: null } }
    ]);
  });
});
