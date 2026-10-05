import type { Queue } from 'bullmq';

import { addMinutes } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { PlayerQueries } from '../../queries/players.types';

import { LESTA_API } from '../../../../../lib/lesta';
import { JOB } from '../../../contracts';
import { TRACKING } from '../../config/tracking.constants';
import { DispatchService } from '../dispatch.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createDispatch = () => {
  const prisma = mockDeep<PrismaService>();
  const pollQueue = mock<Queue>();
  const sweepQueue = mock<Queue>();
  const queries = mock<PlayerQueries>();

  return { prisma, pollQueue, sweepQueue, queries, dispatch: new DispatchService(prisma, pollQueue, sweepQueue, queries) };
};

const players = (count: number) => Array.from({ length: count }, (_, index) => mock<Player>({ accountId: BigInt(index + 1) }));

const claimed = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('DispatchService.dispatchActive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when no active player is due', async () => {
    const { queries, pollQueue, dispatch } = createDispatch();

    queries.claimDueActivePlayers.mockResolvedValue([]);

    expect(await dispatch.dispatchActive()).toBe(0);
    expect(pollQueue.addBulk).not.toHaveBeenCalled();
  });

  it('claims the due players once per tick and moves them one active interval ahead', async () => {
    const { queries, dispatch } = createDispatch();

    queries.claimDueActivePlayers.mockResolvedValue([]);

    await dispatch.dispatchActive();

    expect(queries.claimDueActivePlayers).toHaveBeenCalledOnce();

    expect(queries.claimDueActivePlayers.mock.calls[0]?.[0]).toMatchObject({
      now: NOW,
      nextPollAt: addMinutes(NOW, TRACKING.intervals.activeMinutes),
      limit: TRACKING.dispatch.maxActivePerTick
    });
  });

  it('queues the claimed accounts in Lesta-sized batches', async () => {
    const { queries, pollQueue, dispatch } = createDispatch();
    const due = claimed(LESTA_API.batchSize + 5);

    queries.claimDueActivePlayers.mockResolvedValue(due);

    expect(await dispatch.dispatchActive()).toBe(due.length);

    const [jobs] = pollQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs?.map((job) => job.name)).toEqual([JOB.poll.batch, JOB.poll.batch]);
    expect(jobs?.flatMap((job) => job.data.accountIds)).toEqual(due);
  });
});

describe('DispatchService.dispatchSweep', () => {
  it('pages through the tier until a short page and gives dormant players a lower priority', async () => {
    const { prisma, sweepQueue, dispatch } = createDispatch();

    sweepQueue.getJobCounts.mockResolvedValue({ waiting: 0, delayed: 0, prioritized: 0 });
    prisma.player.findMany.mockResolvedValueOnce(players(3));

    expect(await dispatch.dispatchSweep('dormant')).toBe(3);

    const [jobs] = sweepQueue.addBulk.mock.calls[0] ?? [];

    expect(prisma.player.findMany).toHaveBeenCalledTimes(1);
    expect(jobs?.every((job) => job.name === JOB.sweep.batch && job.opts?.priority !== undefined)).toBe(true);
  });

  it('skips the sweep while the previous one still has queued batches', async () => {
    const { prisma, sweepQueue, dispatch } = createDispatch();

    sweepQueue.getJobCounts.mockResolvedValue({ waiting: 0, delayed: 0, prioritized: 4 });

    expect(await dispatch.dispatchSweep('population')).toBe(0);
    expect(prisma.player.findMany).not.toHaveBeenCalled();
    expect(sweepQueue.addBulk).not.toHaveBeenCalled();
  });
});
