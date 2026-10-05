import type { Queue } from 'bullmq';

import { addDays, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { LestaClients, PrismaService } from '../../../../core';
import type { GaragePayload } from '../../config/lesta-links-queue.types';

import { createTokenCipher } from '../../../../core/token-cipher/_tests/token-cipher.fixtures';
import { LestaApiError } from '../../../../lib/lesta';
import { LESTA_LINKS_QUEUE } from '../../config/lesta-links-queue.constants';
import { GarageSyncService } from '../garage-sync.service';

const NOW = new Date('2026-09-28T05:20:00Z');

const link = (overrides: Partial<UserLestaAccount> = {}) =>
  mock<UserLestaAccount>({ accessToken: 'token', tokenExpiresAt: addDays(NOW, 5), tokenStaleAt: null, ...overrides });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const clients = mockDeep<LestaClients>();
  const queue = mock<Queue<GaragePayload>>();

  prisma.$transaction.mockResolvedValue([]);

  const cipher = createTokenCipher();

  return { service: new GarageSyncService(prisma, clients, queue, cipher), prisma, clients, queue, cipher };
};

describe('GarageSyncService.sync', () => {
  it('marks the tanks Lesta reports as kept or sold and stamps the sync', async () => {
    const { service, prisma, clients, cipher } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(link({ accessToken: await cipher.seal('token') }));

    clients.bulk.tanks.stats.mockResolvedValue([
      { tank_id: 1, in_garage: true },
      { tank_id: 2, in_garage: false }
    ]);

    await expect(service.sync({ accountId: 7, now: NOW })).resolves.toEqual({ status: 'synced', inGarage: 1, sold: 1 });
    expect(clients.bulk.tanks.stats).toHaveBeenCalledWith(expect.objectContaining({ accountId: 7, accessToken: 'token' }));
    expect(prisma.playerTank.updateMany).toHaveBeenCalledWith({ where: { accountId: 7n, tankId: { in: [1] } }, data: { inGarage: true } });
    expect(prisma.playerTank.updateMany).toHaveBeenCalledWith({ where: { accountId: 7n, tankId: { in: [2] } }, data: { inGarage: false } });
    expect(prisma.userLestaAccount.update).toHaveBeenCalledWith({ where: { accountId: 7n }, data: { garageSyncedAt: NOW } });
  });

  it('never calls Lesta for a stale, expired or tokenless link', async () => {
    for (const stored of [link({ tokenStaleAt: NOW }), link({ tokenExpiresAt: subDays(NOW, 1) }), link({ accessToken: null }), null]) {
      const { service, prisma, clients } = createService();

      prisma.userLestaAccount.findUnique.mockResolvedValue(stored);

      await expect(service.sync({ accountId: 7, now: NOW })).resolves.toEqual({ status: 'skipped' });
      expect(clients.bulk.tanks.stats).not.toHaveBeenCalled();
    }
  });

  it('writes no garage flags when Lesta sent none, but still stamps the sync', async () => {
    const { service, prisma, clients } = createService();

    prisma.userLestaAccount.findUnique.mockResolvedValue(link());
    clients.bulk.tanks.stats.mockResolvedValue([{ tank_id: 1, in_garage: null }]);

    await expect(service.sync({ accountId: 7, now: NOW })).resolves.toEqual({ status: 'unknown' });
    expect(prisma.playerTank.updateMany).not.toHaveBeenCalled();
    expect(prisma.userLestaAccount.update).toHaveBeenCalled();
  });

  it('leaves a rejected token to the renewal job and rethrows an outage for a retry', async () => {
    const rejected = createService();

    rejected.prisma.userLestaAccount.findUnique.mockResolvedValue(link());
    rejected.clients.bulk.tanks.stats.mockRejectedValue(new LestaApiError({ code: 'INVALID_ACCESS_TOKEN', method: 'tanks/stats' }));

    await expect(rejected.service.sync({ accountId: 7, now: NOW })).resolves.toEqual({ status: 'rejected' });

    const outage = createService();

    outage.prisma.userLestaAccount.findUnique.mockResolvedValue(link());
    outage.clients.bulk.tanks.stats.mockRejectedValue(new LestaApiError({ code: 'SOURCE_NOT_AVAILABLE', method: 'tanks/stats' }));

    await expect(outage.service.sync({ accountId: 7, now: NOW })).rejects.toThrow('SOURCE_NOT_AVAILABLE');
  });
});

describe('GarageSyncService.dispatch', () => {
  it('queues one deduplicated garage job per link with a live token', async () => {
    const { service, prisma, queue } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link({ accountId: 1n }), link({ accountId: 2n })]);

    await expect(service.dispatch({ scope: 'pending', now: NOW })).resolves.toBe(2);

    const jobs = queue.addBulk.mock.calls[0]?.[0] ?? [];

    expect(jobs.map((job) => [job.name, job.data.accountId])).toEqual([
      [LESTA_LINKS_QUEUE.jobs.garage, 1],
      [LESTA_LINKS_QUEUE.jobs.garage, 2]
    ]);

    expect(new Set(jobs.map((job) => job.opts?.jobId)).size).toBe(2);
  });

  it('picks only never-synced links of accounts the collector already polled for the frequent pass', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);

    await service.dispatch({ scope: 'pending', now: NOW });

    expect(prisma.userLestaAccount.findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      garageSyncedAt: null,
      tokenStaleAt: null,
      player: { lastPolledAt: { not: null }, isHidden: false }
    });
  });

  it('skips the garage of a player hidden by a deletion request', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);

    await service.dispatch({ scope: 'all', now: NOW });

    expect(prisma.userLestaAccount.findMany.mock.calls[0]?.[0]?.where?.player).toMatchObject({ isHidden: false });
  });
});
