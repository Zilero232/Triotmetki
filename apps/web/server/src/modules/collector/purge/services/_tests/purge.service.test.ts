import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { DataDeletionRequest } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { HYPERTABLE } from '../../../../../core';
import { JOB } from '../../../contracts';
import { PURGE } from '../../config';
import { PurgeService } from '../purge.service';

const requestId = '00000000-0000-4000-8000-000000000001';

const createPurge = () => {
  const prisma = mockDeep<PrismaService>();

  const queue = mock<Queue>();

  prisma.$transaction.mockImplementation(async (run) => run(prisma));

  return { prisma, queue, purge: new PurgeService(prisma, queue) };
};

const statuses = (prisma: ReturnType<typeof createPurge>['prisma']) => prisma.dataDeletionRequest.update.mock.calls.map(([{ data }]) => data.status);

describe('PurgeService.purgeAccount', () => {
  it('deletes the account from every hypertable and closes the request', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(Object.values(HYPERTABLE).length);
    expect(prisma.player.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 5n } }));
    expect(statuses(prisma)).toEqual(['processing', 'completed']);
  });

  it('clears the account from the tables that have no cascade to the player', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    for (const remove of [
      prisma.clanMemberEvent.deleteMany,
      prisma.weeklyChallengeProgress.deleteMany,
      prisma.clanAttendance.deleteMany,
      prisma.recruitCandidate.deleteMany,
      prisma.competitionEntry.deleteMany
    ]) {
      expect(remove).toHaveBeenCalledWith({ where: { accountId: 5n } });
    }

    expect(prisma.replay.updateMany).toHaveBeenCalledWith({ where: { accountId: 5n }, data: { accountId: null } });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('removes the account id from the honest-rng daily player sets', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    const rngUpdates = prisma.$executeRaw.mock.calls.flatMap(([query, ...values]) =>
      'raw' in query && query.join('').includes('rng_daily') ? [{ sql: query.join('?'), values }] : []
    );

    expect(rngUpdates).toEqual([{ sql: expect.stringContaining('players = array_remove(players, ?)'), values: [5n, 5n] }]);
  });

  it('deletes the hypertable rows outside the relational transaction, before it opens', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    const [transactionOrder = 0] = prisma.$transaction.mock.invocationCallOrder;

    expect(prisma.$executeRawUnsafe.mock.invocationCallOrder.every((order) => order < transactionOrder)).toBe(true);
  });

  it('puts the request back to pending when a retry is still left', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: false })).rejects.toThrow('lock timeout');
    expect(statuses(prisma)).toEqual(['processing', 'pending']);
  });

  it('marks the request failed on the last attempt and rethrows', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true })).rejects.toThrow('lock timeout');
    expect(statuses(prisma)).toEqual(['processing', 'failed']);
  });

  it('purges without touching deletion requests when run without one', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(prisma.player.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.dataDeletionRequest.update).not.toHaveBeenCalled();
  });

  it('rethrows a failed purge without a request so the job retries', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, isFinalAttempt: true })).rejects.toThrow('lock timeout');
    expect(prisma.dataDeletionRequest.update).not.toHaveBeenCalled();
  });
});

describe('PurgeService.dispatch', () => {
  const pending = (id: string, accountId: bigint) => mock<DataDeletionRequest>({ id, accountId });

  it('picks pending requests and failed ones whose cooldown has passed', async () => {
    const { prisma, purge } = createPurge();

    prisma.dataDeletionRequest.findMany.mockResolvedValue([]);

    const now = Date.now();

    await purge.dispatch();

    const where = prisma.dataDeletionRequest.findMany.mock.calls[0]?.[0]?.where;
    const retry = where?.OR?.find((branch) => branch.status === 'failed');
    const cutoff = retry?.failedAt;

    expect(where?.OR).toContainEqual({ status: 'pending' });

    expect(cutoff && typeof cutoff === 'object' && 'lte' in cutoff ? Number(cutoff.lte) : Number.NaN).toBeLessThanOrEqual(
      now - PURGE.failedCooldownMs + 1_000
    );
  });

  it('queues every request once, keyed by its id, and drops a finally failed job so a retry can reuse the id', async () => {
    const { prisma, queue, purge } = createPurge();

    prisma.dataDeletionRequest.findMany.mockResolvedValue([pending('r1', 1n), pending('r2', 2n)]);

    expect(await purge.dispatch()).toBe(2);

    const [jobs = []] = queue.addBulk.mock.calls[0] ?? [];

    expect(jobs.map((job) => [job.name, job.data])).toEqual([
      [JOB.purge.account, { accountId: 1, requestId: 'r1' }],
      [JOB.purge.account, { accountId: 2, requestId: 'r2' }]
    ]);

    expect(new Set(jobs.map((job) => job.opts?.jobId)).size).toBe(jobs.length);
    expect(jobs.every((job) => job.opts?.removeOnFail === true)).toBe(true);
  });

  it('dispatches nothing when no request is pending', async () => {
    const { prisma, purge } = createPurge();

    prisma.dataDeletionRequest.findMany.mockResolvedValue([]);

    expect(await purge.dispatch()).toBe(0);
  });
});
