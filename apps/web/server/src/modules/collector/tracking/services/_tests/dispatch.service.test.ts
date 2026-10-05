import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { LESTA_API } from '../../../../../lib/lesta';
import { JOB } from '../../../contracts';
import { DispatchService } from '../dispatch.service';

const createDispatch = () => {
  const prisma = mockDeep<PrismaService>();
  const pollQueue = mock<Queue>();
  const sweepQueue = mock<Queue>();

  return { prisma, pollQueue, sweepQueue, dispatch: new DispatchService(prisma, pollQueue, sweepQueue) };
};

const players = (count: number) => Array.from({ length: count }, (_, index) => mock<Player>({ accountId: BigInt(index + 1) }));

const claimed = (count: number) => Array.from({ length: count }, (_, index) => ({ accountId: BigInt(index + 1) }));

const sqlText = (prisma: ReturnType<typeof createDispatch>['prisma']) =>
  prisma.$queryRaw.mock.calls.map(([query]) => ('strings' in query ? query.strings.join('?') : String(query))).join(' ');

describe('DispatchService.dispatchActive', () => {
  it('does nothing when no active player is due', async () => {
    const { prisma, pollQueue, dispatch } = createDispatch();

    prisma.$queryRaw.mockResolvedValue([]);

    expect(await dispatch.dispatchActive()).toBe(0);
    expect(pollQueue.addBulk).not.toHaveBeenCalled();
  });

  it('claims the due players in one locked update so overlapping ticks never queue the same account', async () => {
    const { prisma, dispatch } = createDispatch();

    prisma.$queryRaw.mockResolvedValue([]);

    await dispatch.dispatchActive();

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    expect(sqlText(prisma)).toMatch(/UPDATE player[\s\S]*FOR UPDATE SKIP LOCKED[\s\S]*RETURNING/);
    expect(prisma.player.findMany).not.toHaveBeenCalled();
    expect(prisma.player.updateMany).not.toHaveBeenCalled();
  });

  it('queues the claimed accounts in Lesta-sized batches', async () => {
    const { prisma, pollQueue, dispatch } = createDispatch();
    const due = claimed(LESTA_API.batchSize + 5);

    prisma.$queryRaw.mockResolvedValue(due);

    expect(await dispatch.dispatchActive()).toBe(due.length);

    const [jobs] = pollQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs?.map((job) => job.name)).toEqual([JOB.poll.batch, JOB.poll.batch]);
    expect(jobs?.flatMap((job) => job.data.accountIds)).toHaveLength(due.length);
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
