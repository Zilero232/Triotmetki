import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, CollectorState } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { jobSuccessKey } from '../../../collector/metrics';
import { COLLECTOR_JOB_SOURCES } from '../../config/health.constants';
import { CollectorStatusReaderService } from '../collector-status-reader.service';

const AT = '2026-09-29T10:00:00.000Z';

const state = (value: unknown) => mock<CollectorState>({ value: JSON.parse(JSON.stringify(value)) });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.collectorState.findUnique
    .mockResolvedValueOnce(state({ [jobSuccessKey(COLLECTOR_JOB_SOURCES.tankStats[0])]: AT }))
    .mockResolvedValueOnce(state({ collectedAt: AT, queues: { 'collector.poll': { waiting: 2, lagSeconds: 30 } } }));

  prisma.wn8ExpectedValue.findFirst.mockResolvedValue(null);
  prisma.gameVersion.findFirst.mockResolvedValue(null);
  prisma.battle.findFirst.mockResolvedValue(mock<Battle>({ receivedAt: new Date(AT) }));

  return { prisma, service: new CollectorStatusReaderService(prisma) };
};

describe('CollectorStatusReaderService.status', () => {
  it('reads job successes, the queue snapshot and the latest mod battle', async () => {
    const { service } = createService();

    const status = await service.status();

    expect(status.jobs.find(({ job }) => job === 'tankStats')?.lastSuccessAt).toBe(AT);
    expect(status.queues).toEqual([{ queue: 'collector.poll', waiting: 2, active: 0, delayed: 0, failed: 0, lagSeconds: 30 }]);
    expect(status.queuesCollectedAt).toBe(AT);
    expect(status.lastModBattleAt).toBe(AT);
  });

  it('answers an all-unknown status instead of failing when the database is down', async () => {
    const { prisma, service } = createService();

    prisma.battle.findFirst.mockRejectedValue(new Error('ECONNREFUSED'));

    const status = await service.status();

    expect(status.lastModBattleAt).toBeNull();
    expect(status.jobs.every(({ lastSuccessAt }) => lastSuccessAt === null)).toBe(true);
  });

  it('serves repeated checks from the cache', async () => {
    const { prisma, service } = createService();

    await service.status();
    await service.status();

    expect(prisma.battle.findFirst).toHaveBeenCalledOnce();
  });
});
