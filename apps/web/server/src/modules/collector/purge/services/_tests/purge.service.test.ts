import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { DataDeletionRequest, Replay } from '../../../../../../generated';
import type { ObjectStorage } from '../../../../../core';
import type { PurgeQueries } from '../../queries/purge.types';

import { modPresenceKey } from '../../../../../common/lib';
import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { JOB } from '../../../contracts';
import { PURGE } from '../../config/purge.constants';
import { PurgeService } from '../purge.service';

const requestId = '00000000-0000-4000-8000-000000000001';

const createPurge = () => {
  const prisma = mockPrismaService();
  const queue = mock<Queue>();
  const storage = mock<ObjectStorage>();
  const queries = mock<PurgeQueries>();
  const redis = mock<Redis>();

  prisma.$transaction.mockImplementation(async (run) => run(prisma));
  prisma.dataDeletionRequest.updateMany.mockResolvedValue({ count: 1 });
  prisma.replay.findMany.mockResolvedValue([]);

  return { prisma, queue, storage, queries, redis, purge: new PurgeService(prisma, queue, storage, queries, redis) };
};

const statuses = (prisma: ReturnType<typeof createPurge>['prisma']) =>
  prisma.dataDeletionRequest.updateMany.mock.calls.map(([{ data }]) => data.status);

describe('PurgeService.purgeAccount', () => {
  it('deletes the account from the hypertables, deletes the player and closes the request', async () => {
    const { prisma, queries, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(queries.deleteAccountTimeSeries).toHaveBeenCalledWith(expect.objectContaining({ accountId: 5 }));
    expect(prisma.player.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 5n } }));
    expect(statuses(prisma)).toEqual(['processing', 'completed']);
  });

  it('clears the account from the tables that have no cascade to the player', async () => {
    const { prisma, queries, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    for (const remove of [
      prisma.clanMemberEvent.deleteMany,
      prisma.weeklyChallengeProgress.deleteMany,
      prisma.clanAttendance.deleteMany,
      prisma.recruitCandidate.deleteMany,
      prisma.competitionEntry.deleteMany,
      prisma.tournamentParticipant.deleteMany
    ]) {
      expect(remove).toHaveBeenCalledWith({ where: { accountId: 5n } });
    }

    expect(queries.removeAccountFromRngPlayers).toHaveBeenCalledWith(expect.objectContaining({ accountId: 5 }));
  });

  it('deletes the replays the account recorded together with their stored files', async () => {
    const { prisma, storage, purge } = createPurge();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', storageKey: 'replays/a.mtreplay', timelineKey: 'timelines/a.json' })]);

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(prisma.replay.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } } });
    expect(storage.remove.mock.calls.map(([key]) => key).sort()).toEqual(['replays/a.mtreplay', 'timelines/a.json']);
  });

  it('keeps purging when a replay file cannot be removed', async () => {
    const { prisma, storage, purge } = createPurge();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', storageKey: 'replays/a.mtreplay', timelineKey: 'timelines/a.json' })]);
    storage.remove.mockRejectedValueOnce(new Error('gone'));

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(storage.remove).toHaveBeenCalledTimes(2);
  });

  it('forgets the mod presence of the purged account, so its badge stops showing', async () => {
    const { redis, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(redis.del).toHaveBeenCalledWith(modPresenceKey(5));
  });

  it('keeps the mod presence when a re-link cancels the purge', async () => {
    const { prisma, redis, purge } = createPurge();

    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(redis.del).not.toHaveBeenCalled();
  });

  it('keeps the recorded replay files when a re-link cancels the purge', async () => {
    const { prisma, storage, purge } = createPurge();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', storageKey: 'replays/a.mtreplay', timelineKey: null })]);
    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('replaces the account with the anonymous placeholder in the summaries of other people replays', async () => {
    const { queries, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    expect(queries.scrubReplayPlayer).toHaveBeenCalledWith(expect.objectContaining({ accountId: 5, placeholder: PURGE.anonymousReplayName }));
  });

  it('scrubs the replay summaries before it drops the account from their player sets', async () => {
    const { queries, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, isFinalAttempt: true });

    const [scrubOrder = Number.POSITIVE_INFINITY] = queries.scrubReplayPlayer.mock.invocationCallOrder;
    const [removeOrder = 0] = queries.removeAccountFromReplayPlayers.mock.invocationCallOrder;

    expect(scrubOrder).toBeLessThan(removeOrder);
  });

  it('deletes the hypertable rows outside the relational transaction, before it opens', async () => {
    const { prisma, queries, purge } = createPurge();

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    const [transactionOrder = 0] = prisma.$transaction.mock.invocationCallOrder;
    const [timeSeriesOrder = Number.POSITIVE_INFINITY] = queries.deleteAccountTimeSeries.mock.invocationCallOrder;

    expect(timeSeriesOrder).toBeLessThan(transactionOrder);
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

  it('marks the request failed when the hypertable delete fails on the last attempt', async () => {
    const { prisma, queries, purge } = createPurge();

    queries.deleteAccountTimeSeries.mockRejectedValue(new Error('timeout'));

    await expect(purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true })).rejects.toThrow('timeout');
    expect(statuses(prisma).at(-1)).toBe('failed');
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
    const { prisma, queries, purge } = createPurge();

    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(queries.deleteAccountTimeSeries).not.toHaveBeenCalled();
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
    const { prisma, queries, purge } = createPurge();

    prisma.dataDeletionRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await purge.purgeAccount({ accountId: 5, requestId, isFinalAttempt: true });

    expect(prisma.player.deleteMany).not.toHaveBeenCalled();
    expect(prisma.clanMemberEvent.deleteMany).not.toHaveBeenCalled();
    expect(queries.scrubReplayPlayer).not.toHaveBeenCalled();
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

  it('picks a request left processing by a crashed job again, its job id keeping a live run from doubling', async () => {
    const { prisma, purge } = createPurge();

    prisma.dataDeletionRequest.findMany.mockResolvedValue([]);

    await purge.dispatch();

    expect(prisma.dataDeletionRequest.findMany.mock.calls[0]?.[0]?.where?.OR).toContainEqual({ status: 'processing' });
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
