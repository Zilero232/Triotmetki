import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../../core';
import type { PollResult } from '../../tracking.types';

import { JOB } from '../../../contracts';
import { EnrolService } from '../enrol.service';
import { PollSyncService } from '../poll-sync.service';

const result = (fields: Partial<PollResult> = {}): PollResult => ({
  requested: 1,
  blocked: [],
  missing: [],
  unchanged: [],
  updated: [1],
  failed: [],
  snapshots: 0,
  deltas: 0,
  ...fields
});

const createEnrol = (outcome: PollResult) => {
  const prisma = mockDeep<PrismaService>();
  const pipeline = mock<PollSyncService>();
  const clansQueue = mock<Queue>();

  pipeline.run.mockResolvedValue(outcome);

  return { prisma, pipeline, clansQueue, enrol: new EnrolService(prisma, pipeline, clansQueue) };
};

describe('EnrolService.enrol', () => {
  it('polls the account at once on the priority lane and promotes it to active', async () => {
    const { pipeline, enrol } = createEnrol(result());

    await enrol.enrol({ accountId: 1, reason: 'search' });

    expect(pipeline.run).toHaveBeenCalledWith({ accountIds: [1], lane: 'priority', tier: 'active', promote: true });
  });

  it('marks the account as viewed and fetches its clan history once enrolled', async () => {
    const { prisma, clansQueue, enrol } = createEnrol(result());

    await enrol.enrol({ accountId: 1, reason: 'search' });

    expect(prisma.player.updateMany.mock.calls[0]?.[0].data.lastViewedAt).toBeInstanceOf(Date);

    expect(clansQueue.add).toHaveBeenCalledWith(
      JOB.clans.history,
      { accountIds: [1] },
      expect.objectContaining({ deduplication: expect.anything() })
    );
  });

  it.each([
    ['purged', result({ blocked: [1], updated: [] })],
    ['missing from Lesta', result({ missing: [1], updated: [] })]
  ])('stops without side effects when the account is %s', async (_, outcome) => {
    const { prisma, clansQueue, enrol } = createEnrol(outcome);

    expect(await enrol.enrol({ accountId: 1, reason: 'search' })).toBe(outcome);
    expect(prisma.player.updateMany).not.toHaveBeenCalled();
    expect(clansQueue.add).not.toHaveBeenCalled();
  });
});
