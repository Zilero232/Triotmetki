import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { DataDeletionRequest, Replay } from '../../../../../../generated';
import type { ObjectStorage, PrismaService } from '../../../../../core';

import { HYPERTABLE } from '../../../../../core';
import { JOB } from '../../../contracts';
import { PURGE } from '../../config';
import { PurgeService } from '../purge.service';

const requestId = '00000000-0000-4000-8000-000000000001';

const createPurge = () => {
  const prisma = mockDeep<PrismaService>();

  const queue = mock<Queue>();
  const storage = mock<ObjectStorage>();

  prisma.$transaction.mockImplementation(async (run) => run(prisma));
  prisma.dataDeletionRequest.updateMany.mockResolvedValue({ count: 1 });
  prisma.replay.findMany.mockResolvedValue([]);

  return { prisma, queue, storage, purge: new PurgeService(prisma, queue, storage) };
};

const executedSql = (prisma: ReturnType<typeof createPurge>['prisma']) =>
  prisma.$executeRaw.mock.calls.map(([query, ...values]) =>
    'raw' in query ? { sql: query.join('?'), values } : { sql: query.sql, values: query.values }
  );

const statuses = (prisma: ReturnType<typeof createPurge>['prisma']) =>
  prisma.dataDeletionRequest.updateMany.mock.calls.map(([{ data }]) => data.status);

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

    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('deletes the replays the account recorded together with their stored files', async () => {
    const { prisma, storage, purge } = createPurge();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', storageKey: 'replays/a.mtreplay', timelineKey: 'timelines/a.json' })]);

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(prisma.replay.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } } });
    expect(storage.remove.mock.calls.map(([key]) => key).sort()).toEqual(['replays/a.mtreplay', 'timelines/a.json']);
  });

  it('keeps the recorded replay files when a re-link cancels the purge', async () => {
    const { prisma, storage, purge } = createPurge();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', storageKey: 'replays/a.mtreplay', timelineKey: null })]);
    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('replaces the account with an anonymous placeholder in the summaries of other people replays', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    const scrubs = executedSql(prisma).filter(({ sql }) => sql.includes("'{players}'"));

    expect(scrubs).toHaveLength(1);
    expect(scrubs[0]?.sql).toContain("'accountId', NULL");
    expect(scrubs[0]?.sql).toContain("'clanTag', NULL");
    expect(scrubs[0]?.values).toContain(PURGE.anonymousReplayName);
  });

  it('scrubs the replay summaries before it drops the account from their player sets', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    const order = executedSql(prisma).map(({ sql }) => sql);
    const scrub = order.findIndex((sql) => sql.includes("'{players}'"));
    const remove = order.findIndex((sql) => sql.includes('player_account_ids = array_remove'));

    expect(scrub).toBeGreaterThanOrEqual(0);
    expect(scrub).toBeLessThan(remove);
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
    expect([statuses(prisma)[0], statuses(prisma).at(-1)]).toEqual(['processing', 'pending']);
  });

  it('marks the request failed on the last attempt and rethrows', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true })).rejects.toThrow('lock timeout');
    expect([statuses(prisma)[0], statuses(prisma).at(-1)]).toEqual(['processing', 'failed']);
  });

  it('purges without touching deletion requests when run without one', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(prisma.player.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.dataDeletionRequest.updateMany).not.toHaveBeenCalled();
  });

  it('rethrows a failed purge without a request so the job retries', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, isFinalAttempt: true })).rejects.toThrow('lock timeout');
    expect(prisma.dataDeletionRequest.updateMany).not.toHaveBeenCalled();
  });
});

describe('PurgeService.purgeAccount after a re-link', () => {
  it('claims only a request that is still open, so a superseded one is never started', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(prisma.dataDeletionRequest.updateMany.mock.calls[0]?.[0]).toEqual({
      where: { id: requestId, status: { in: PURGE.claimableStatuses } },
      data: { status: 'processing' }
    });
  });

  it('skips the purge when the request was superseded before it started', async () => {
    const { prisma, purge } = createPurge();

    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.player.deleteMany).not.toHaveBeenCalled();
  });

  it('closes the request inside the relational transaction, before it deletes the player', async () => {
    const { prisma, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    const [, complete] = prisma.dataDeletionRequest.updateMany.mock.calls;
    const [, completeOrder = Number.POSITIVE_INFINITY] = prisma.dataDeletionRequest.updateMany.mock.invocationCallOrder;
    const [deleteOrder = 0] = prisma.player.deleteMany.mock.invocationCallOrder;

    expect(complete?.[0].where).toEqual({ id: requestId, status: 'processing' });
    expect(completeOrder).toBeLessThan(deleteOrder);
  });

  it('keeps the relational rows when the account was re-linked while the purge ran', async () => {
    const { prisma, purge } = createPurge();

    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(prisma.player.deleteMany).not.toHaveBeenCalled();
    expect(prisma.clanMemberEvent.deleteMany).not.toHaveBeenCalled();
  });

  it('never overwrites a superseded request when the purge fails', async () => {
    const { prisma, purge } = createPurge();

    prisma.player.deleteMany.mockRejectedValue(new Error('lock timeout'));

    await expect(purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: false })).rejects.toThrow('lock timeout');
    expect(prisma.dataDeletionRequest.updateMany.mock.calls.at(-1)?.[0].where).toEqual({ id: requestId, status: 'processing' });
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
