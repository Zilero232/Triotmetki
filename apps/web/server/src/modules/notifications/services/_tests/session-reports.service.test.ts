import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlaySession, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { NotificationService } from '../notification.service';

import { SessionReportsService } from '../session-reports.service';

const session = {
  ...mock<PlaySession>({
    id: 's1',
    accountId: 7n,
    battles: 4,
    wins: 3,
    damageDealt: 8000,
    wn8: 2100,
    lastActivityAt: new Date('2026-09-25T11:00:00Z')
  }),
  player: { nickname: 'Tanker', logoutAt: null }
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const notifications = mock<NotificationService>();

  prisma.playSession.findMany.mockResolvedValue([session]);
  prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ userId: 'owner' })]);
  notifications.notifyMany.mockResolvedValue(1);

  return { service: new SessionReportsService(prisma, notifications), prisma, notifications };
};

describe('SessionReportsService', () => {
  it('reports an idle session once with per-battle averages', async () => {
    const { service, prisma, notifications } = createService();

    prisma.playSession.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.run()).toBe(1);

    expect(notifications.notifyMany).toHaveBeenCalledWith({
      userIds: ['owner'],
      dedupeKey: 'session-s1',
      notification: expect.objectContaining({ event: 'sessionFinished', battles: 4, winRate: 0.75, avgDamage: 2000, wn8: 2100 })
    });
  });

  it('reports right after the player logs out and waits while they still play', async () => {
    const { service, prisma, notifications } = createService();
    const now = new Date('2026-09-25T11:05:00Z');

    prisma.playSession.updateMany.mockResolvedValue({ count: 1 });
    const loggedOut = { ...session, player: { nickname: 'Tanker', logoutAt: new Date('2026-09-25T11:03:00Z') } };
    const stillPlaying = { ...session, player: { nickname: 'Tanker', logoutAt: null } };

    prisma.playSession.findMany.mockResolvedValue([loggedOut]);

    expect(await service.run(now)).toBe(1);

    prisma.playSession.findMany.mockResolvedValue([stillPlaying]);
    notifications.notifyMany.mockClear();

    expect(await service.run(now)).toBe(0);
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('skips a session another worker already claimed', async () => {
    const { service, prisma, notifications } = createService();

    prisma.playSession.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.run()).toBe(0);
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('reports only live mod sessions, never the api day rollup of the same play', async () => {
    const { service, prisma } = createService();

    prisma.playSession.updateMany.mockResolvedValue({ count: 1 });

    await service.run();

    expect(prisma.playSession.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ source: 'mod', kind: 'live' });
  });

  it('releases the claim when the report cannot be queued so the next run reports it', async () => {
    const { service, prisma, notifications } = createService();
    const now = new Date('2026-09-25T12:00:00Z');

    prisma.playSession.updateMany.mockResolvedValue({ count: 1 });
    notifications.notifyMany.mockRejectedValueOnce(new Error('redis down'));

    await expect(service.run(now)).rejects.toThrow('redis down');
    expect(prisma.playSession.updateMany).toHaveBeenLastCalledWith({ where: { id: 's1', reportSentAt: now }, data: { reportSentAt: null } });
  });
});
