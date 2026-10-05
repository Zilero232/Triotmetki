import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { ObjectStorage, PrismaService } from '../../../../core';
import type { HeatmapWriterService } from '../heatmap-writer.service';

import { REPLAY_PARSE } from '../../config/parse.constants';
import { ReplayParseService } from '../replay-parse.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const storage = mock<ObjectStorage>();
  const heatmaps = mock<HeatmapWriterService>();

  return { service: new ReplayParseService(prisma, storage, heatmaps), prisma, storage, heatmaps };
};

describe('ReplayParseService.parse', () => {
  it('reports a replay deleted before the job ran as missing', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findUnique.mockResolvedValue(null);

    expect(await service.parse({ replayId: 'r1', isFinalAttempt: false })).toEqual({ status: 'missing', hasTracks: false });
    expect(prisma.replay.update).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('marks a file that is not a replay as failed with a bounded parse error', async () => {
    const { service, prisma, storage, heatmaps } = createService();

    prisma.replay.findUnique.mockResolvedValue(mock<Replay>({ id: 'r1', storageKey: 'replays/r1.mtreplay', heatmapAppliedAt: null }));
    storage.get.mockResolvedValue(new TextEncoder().encode('not a replay'));

    expect(await service.parse({ replayId: 'r1', isFinalAttempt: false })).toEqual({ status: 'failed', hasTracks: false });

    const failed = prisma.replay.update.mock.calls.at(-1)?.[0].data;

    expect(failed?.status).toBe('failed');
    expect(String(failed?.parseError).length).toBeGreaterThan(0);
    expect(String(failed?.parseError).length).toBeLessThanOrEqual(REPLAY_PARSE.maxErrorLength);
    expect(storage.put).not.toHaveBeenCalled();
    expect(heatmaps.apply).not.toHaveBeenCalled();
  });

  it('flags the replay as parsing before reading the file', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findUnique.mockResolvedValue(mock<Replay>({ id: 'r1', storageKey: 'replays/r1.mtreplay', heatmapAppliedAt: null }));
    storage.get.mockResolvedValue(new TextEncoder().encode('not a replay'));

    await service.parse({ replayId: 'r1', isFinalAttempt: false });

    expect(prisma.replay.update.mock.calls[0]?.[0]).toEqual({ where: { id: 'r1' }, data: { status: 'parsing' } });
  });

  it.each([
    [true, 'failed'],
    [false, 'uploaded']
  ] as const)('leaves no replay stuck in parsing when storage throws (final attempt: %s)', async (isFinalAttempt, status) => {
    const { service, prisma, storage } = createService();

    prisma.replay.findUnique.mockResolvedValue(mock<Replay>({ id: 'r1', storageKey: 'replays/r1.mtreplay', heatmapAppliedAt: null }));
    storage.get.mockRejectedValue(new Error('storage down'));

    await expect(service.parse({ replayId: 'r1', isFinalAttempt })).rejects.toThrow('storage down');
    expect(prisma.replay.update.mock.calls.at(-1)?.[0]).toEqual({ where: { id: 'r1' }, data: { status, parseError: 'storage down' } });
  });
});
