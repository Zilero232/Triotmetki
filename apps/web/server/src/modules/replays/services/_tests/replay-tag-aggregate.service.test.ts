import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { parseReplaySummary } from '../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../lib/replay/_tests/fixtures';
import { REPLAY_TAGGING } from '../../config/tagging.constants';
import { ReplayTagAggregateService } from '../replay-tag-aggregate.service';

const SUMMARY = JSON.parse(JSON.stringify(parseReplaySummary(readFixture(FIXTURE.wgFull))));

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockResolvedValue([]);

  return { prisma, service: new ReplayTagAggregateService(prisma) };
};

describe('ReplayTagAggregateService.run', () => {
  it('only picks parsed replays tagged by an older rules version', async () => {
    const { prisma, service } = createService();

    prisma.replay.findMany.mockResolvedValue([]);

    await expect(service.run()).resolves.toEqual({ tagged: 0, skipped: 0 });
    expect(prisma.replay.findMany.mock.calls[0]?.[0]?.where).toEqual({ status: 'parsed', tagsVersion: { lt: REPLAY_TAGGING.version } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('writes the tag columns from a readable stored summary', async () => {
    const { prisma, service } = createService();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', summary: SUMMARY })]);

    await expect(service.run()).resolves.toEqual({ tagged: 1, skipped: 0 });
    expect(prisma.replay.update.mock.calls[0]?.[0]?.data).toMatchObject({ tagsVersion: REPLAY_TAGGING.version, tags: expect.any(Array) });
  });

  it('marks an unreadable summary as done without inventing tags', async () => {
    const { prisma, service } = createService();

    prisma.replay.findMany.mockResolvedValue([mock<Replay>({ id: 'r1', summary: { broken: true } })]);

    await expect(service.run()).resolves.toEqual({ tagged: 0, skipped: 1 });
    expect(prisma.replay.update.mock.calls[0]?.[0]?.data).toEqual({ tagsVersion: REPLAY_TAGGING.version });
  });
});
