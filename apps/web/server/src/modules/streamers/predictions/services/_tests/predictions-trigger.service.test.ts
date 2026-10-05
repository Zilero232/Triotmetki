import type { Queue } from 'bullmq';

import { subSeconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../../core';

import { STREAMERS_QUEUE } from '../../../config/queue.constants';
import { PREDICTIONS } from '../../config/predictions.constants';
import { PredictionsTriggerService } from '../predictions-trigger.service';

const NOW = new Date(Date.UTC(2026, 9, 5, 18));

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const queue = mock<Queue>();
  const service = new PredictionsTriggerService(prisma, queue);

  return { service, prisma, queue };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PredictionsTriggerService.started', () => {
  it('queues a prediction for a fresh battle of a streamer with predictions on', async () => {
    const { service, prisma, queue } = createService();
    const occurredAt = subSeconds(NOW, 10);

    prisma.streamerIntegration.count.mockResolvedValue(1);

    await service.started({ accountId: 42n, tankId: 7, occurredAt });

    expect(prisma.streamerIntegration.count).toHaveBeenCalledWith({
      where: {
        provider: 'twitch',
        config: { path: ['predictions'], equals: true },
        OR: [{ user: { streamerProfile: { accountId: 42n } } }, { user: { lestaAccounts: { some: { accountId: 42n, isPrimary: true } } } }]
      }
    });

    expect(queue.add).toHaveBeenCalledWith(
      STREAMERS_QUEUE.jobs.predictionOpen,
      { accountId: '42', tankId: 7, occurredAt: occurredAt.toISOString() },
      { removeOnComplete: true, removeOnFail: PREDICTIONS.failedJobsKept }
    );
  });

  it('ignores a battle without a tank', async () => {
    const { service, prisma, queue } = createService();

    await service.started({ accountId: 42n, tankId: null, occurredAt: NOW });

    expect(prisma.streamerIntegration.count).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('ignores a battle that started too long ago', async () => {
    const { service, prisma, queue } = createService();

    await service.started({ accountId: 42n, tankId: 7, occurredAt: subSeconds(NOW, PREDICTIONS.startFreshSeconds + 1) });

    expect(prisma.streamerIntegration.count).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('still queues a battle exactly at the freshness limit', async () => {
    const { service, prisma, queue } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(1);

    await service.started({ accountId: 42n, tankId: 7, occurredAt: subSeconds(NOW, PREDICTIONS.startFreshSeconds) });

    expect(queue.add).toHaveBeenCalledOnce();
  });

  it('queues nothing when no streamer watches the account', async () => {
    const { service, prisma, queue } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(0);

    await service.started({ accountId: 42n, tankId: 7, occurredAt: NOW });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('swallows a failing lookup so the battle ingest never breaks', async () => {
    const { service, prisma, queue } = createService();

    prisma.streamerIntegration.count.mockRejectedValue(new Error('db down'));

    await expect(service.started({ accountId: 42n, tankId: 7, occurredAt: NOW })).resolves.toBeUndefined();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('swallows a failing enqueue', async () => {
    const { service, prisma, queue } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(1);
    queue.add.mockRejectedValue(new Error('redis down'));

    await expect(service.started({ accountId: 42n, tankId: 7, occurredAt: NOW })).resolves.toBeUndefined();
  });
});
