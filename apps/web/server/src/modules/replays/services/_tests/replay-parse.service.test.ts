import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { ObjectStorage, PrismaService } from '../../../../core';
import type { PurgeGuardService } from '../../../collector/purge';
import type { HeatmapWriterService } from '../heatmap-writer.service';

import { parseReplaySummary, replaySummarySchema } from '../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../lib/replay/_tests/fixtures';
import { PURGE } from '../../../collector/purge';
import { REPLAY_PARSE } from '../../config/parse.constants';
import { ReplayParseService } from '../replay-parse.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const storage = mock<ObjectStorage>();
  const heatmaps = mock<HeatmapWriterService>();
  const purgeGuard = mock<PurgeGuardService>();

  purgeGuard.blocked.mockResolvedValue(new Set());

  return { service: new ReplayParseService(prisma, storage, heatmaps, purgeGuard), prisma, storage, heatmaps, purgeGuard };
};

const fixture = readFixture(FIXTURE.wgFull);
const fixtureSummary = parseReplaySummary(fixture);
const recorderId = fixtureSummary.recorder.accountId ?? 0;
const stranger = fixtureSummary.players.find((player) => !player.isRecorder && player.accountId !== null);
const strangerId = stranger?.accountId ?? 0;

const parseFixture = async (blocked: readonly number[]) => {
  const { service, prisma, storage, purgeGuard } = createService();

  prisma.replay.findUnique.mockResolvedValue(mock<Replay>({ id: 'r1', storageKey: 'replays/r1.mtreplay', heatmapAppliedAt: null }));
  prisma.vehicle.findUnique.mockResolvedValue(null);
  prisma.battle.findUnique.mockResolvedValue(null);
  storage.get.mockResolvedValue(fixture);
  purgeGuard.blocked.mockResolvedValue(new Set(blocked));

  const outcome = await service.parse({ replayId: 'r1', isFinalAttempt: false });
  const data = prisma.replay.update.mock.calls.at(-1)?.[0].data;

  return { outcome, data, prisma, purgeGuard };
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

describe('ReplayParseService.parse with deleted accounts', () => {
  it('asks the purge guard about the recorder and every player', async () => {
    const { purgeGuard } = await parseFixture([]);

    expect(purgeGuard.blocked.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([recorderId, strangerId]));
  });

  it('anonymises a blocked player in the stored summary', async () => {
    const { data } = await parseFixture([strangerId]);
    const summary = replaySummarySchema.parse(data?.summary);
    const scrubbed = summary.players.find((player) => player.vehicleId === stranger?.vehicleId);

    expect(scrubbed).toEqual(expect.objectContaining({ accountId: null, name: PURGE.anonymousReplayName, clanTag: null }));
  });

  it('drops a blocked player from the participant ids', async () => {
    const { data } = await parseFixture([strangerId]);

    expect(data?.playerAccountIds).not.toContain(BigInt(strangerId));
  });

  it('keeps the owner account when only another player is blocked', async () => {
    const { data } = await parseFixture([strangerId]);

    expect(data?.accountId).toBe(BigInt(recorderId));
  });

  it('clears the replay owner account when the recorder is blocked', async () => {
    const { data } = await parseFixture([recorderId]);

    expect(data?.accountId).toBeNull();
  });

  it('anonymises a blocked recorder in the stored summary', async () => {
    const { data } = await parseFixture([recorderId]);
    const summary = replaySummarySchema.parse(data?.summary);

    expect(summary.recorder).toEqual(expect.objectContaining({ accountId: null, name: PURGE.anonymousReplayName }));
  });

  it('links no battle of a blocked recorder', async () => {
    const { prisma } = await parseFixture([recorderId]);

    expect(prisma.battle.findUnique).not.toHaveBeenCalled();
  });
});
