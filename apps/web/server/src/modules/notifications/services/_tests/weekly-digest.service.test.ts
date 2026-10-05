import type { Queue } from 'bullmq';

import { subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Notification, NotificationSettings, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { DigestPayload } from '../../config/notifications-queue.types';

import { UserAccountsReaderService } from '../../../accounts';
import { WEEKLY_DIGEST } from '../../config/watchers.constants';
import { WeeklyDigestService } from '../weekly-digest.service';

const NOW = new Date('2026-09-28T09:00:00.000Z');

const settings = (userId: string): NotificationSettings => mock<NotificationSettings>({ userId });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const queue = mock<Queue<DigestPayload>>();

  prisma.userLestaAccount.findMany.mockResolvedValue([]);

  vi.mocked(prisma.playSession.aggregate).mockResolvedValue({
    _sum: { battles: null, wins: null, damageDealt: null },
    _count: { _all: 0 },
    _avg: {},
    _min: {},
    _max: {}
  });

  prisma.notification.findMany.mockResolvedValue([]);

  return { service: new WeeklyDigestService(prisma, queue, new UserAccountsReaderService(prisma)), prisma, queue };
};

describe('WeeklyDigestService.run', () => {
  it('queues nothing when nobody opted in', async () => {
    const { service, prisma, queue } = createService();

    prisma.notificationSettings.findMany.mockResolvedValue([]);

    await expect(service.run(NOW)).resolves.toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues one digest per user with a job id unique to the ISO week', async () => {
    const { service, prisma, queue } = createService();

    prisma.notificationSettings.findMany.mockResolvedValue([settings('a'), settings('b')]);

    await expect(service.run(NOW)).resolves.toBe(2);
    expect(queue.add.mock.calls.map((call) => call[2]?.jobId)).toEqual(['digest__a__2026-W40', 'digest__b__2026-W40']);
  });

  it('keeps the job id stable within a week so a rerun does not send twice', async () => {
    const { service, prisma, queue } = createService();

    prisma.notificationSettings.findMany.mockResolvedValue([settings('a')]);

    await service.run(NOW);
    await service.run(new Date('2026-10-04T20:00:00.000Z'));

    expect(queue.add.mock.calls[0]?.[2]?.jobId).toBe(queue.add.mock.calls[1]?.[2]?.jobId);
  });

  it('pages through users by cursor until a short page', async () => {
    const { service, prisma } = createService();
    const full = Array.from({ length: WEEKLY_DIGEST.batchSize }, (_, index) => settings(`u${String(index).padStart(4, '0')}`));

    prisma.notificationSettings.findMany.mockResolvedValueOnce(full).mockResolvedValueOnce([settings('z')]);

    await expect(service.run(NOW)).resolves.toBe(WEEKLY_DIGEST.batchSize + 1);
    expect(prisma.notificationSettings.findMany.mock.calls[1]?.[0]?.where).toMatchObject({ userId: { gt: full.at(-1)?.userId } });
  });
});

describe('WeeklyDigestService.digestOf', () => {
  it('reports zeros for a user without battles', async () => {
    const { service } = createService();

    await expect(service.digestOf({ userId: 'a', since: subDays(NOW, 7) })).resolves.toEqual({
      battles: 0,
      wins: 0,
      damageDealt: 0,
      sessions: 0,
      marksGained: 0
    });
  });

  it('sums the sessions of every linked account and counts gained marks', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 1n }), mock<UserLestaAccount>({ accountId: 2n })]);

    vi.mocked(prisma.playSession.aggregate).mockResolvedValue({
      _sum: { battles: 30, wins: 16, damageDealt: 60_000 },
      _count: { _all: 4 },
      _avg: {},
      _min: {},
      _max: {}
    });

    prisma.notification.findMany.mockResolvedValue([mock<Notification>({ id: 'n1' }), mock<Notification>({ id: 'n2' })]);

    const digest = await service.digestOf({ userId: 'a', since: subDays(NOW, 7) });

    expect(digest).toEqual({ battles: 30, wins: 16, damageDealt: 60_000, sessions: 4, marksGained: 2 });
    expect(vi.mocked(prisma.playSession.aggregate).mock.calls[0]?.[0].where).toMatchObject({ accountId: { in: [1n, 2n] } });
  });
});
