import type { Job, Queue } from 'bullmq';

import { subSeconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { CircuitBreakerService } from '../../metrics';
import type { QueueRegistryService } from '../../queues';

import { COLLECTOR_STATE_KEY } from '../../config';
import { QueueStatsService } from '../queue-stats.service';

const NOW = new Date('2026-09-26T12:00:30Z');

const queue = (name: string, counts: Record<string, number>, oldest: Job | undefined) => {
  const stub = mock<Queue>({ name });

  stub.getJobCounts.mockResolvedValue(counts);
  stub.getJobs.mockResolvedValue(oldest ? [oldest] : []);

  return stub;
};

const createStats = (queues: Queue[]) => {
  const prisma = mockDeep<PrismaService>();
  const registry = mock<QueueRegistryService>();
  const breaker = mock<CircuitBreakerService>();
  const config = mock<AppConfigService>();

  registry.all.mockReturnValue(queues);
  breaker.isOpen.mockReturnValue(false);
  config.get.mockReturnValue(20);
  prisma.$transaction.mockResolvedValue([]);

  return { prisma, breaker, stats: new QueueStatsService(prisma, registry, breaker, config) };
};

describe('QueueStatsService.collect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records the lag of the oldest waiting job and the backlog depth per queue', async () => {
    const lag = 45;
    const counts = { waiting: 3, prioritized: 2, delayed: 1, active: 4, failed: 9 };
    const { prisma, stats } = createStats([queue('poll', counts, mock<Job>({ timestamp: subSeconds(NOW, lag).getTime() }))]);

    await stats.collect();

    expect(prisma.collectorJobMetric.upsert.mock.calls[0]?.[0].create).toMatchObject({
      queue: 'poll',
      lagSeconds: lag,
      queueDepth: counts.waiting + counts.prioritized + counts.delayed
    });
  });

  it('reports zero lag and depth for an idle queue', async () => {
    const { prisma, stats } = createStats([queue('news', {}, undefined)]);

    await stats.collect();

    expect(prisma.collectorJobMetric.upsert.mock.calls[0]?.[0].create).toMatchObject({ lagSeconds: 0, queueDepth: 0 });
  });

  it('never reports negative lag for a job stamped in the future', async () => {
    const { prisma, stats } = createStats([queue('poll', { waiting: 1 }, mock<Job>({ timestamp: NOW.getTime() + 60_000 }))]);

    await stats.collect();

    expect(prisma.collectorJobMetric.upsert.mock.calls[0]?.[0].create).toMatchObject({ lagSeconds: 0 });
  });

  it('stores the queue snapshot and the Lesta budget with the breaker state', async () => {
    const { prisma, breaker, stats } = createStats([queue('poll', { waiting: 1 }, undefined)]);

    breaker.isOpen.mockReturnValue(true);

    await stats.collect();

    const writes = prisma.collectorState.upsert.mock.calls.map(([args]) => args);

    expect(writes.map((write) => write.where.key)).toEqual([COLLECTOR_STATE_KEY.queues, COLLECTOR_STATE_KEY.lestaBudget]);
    expect(writes[1]?.update.value).toMatchObject({ requestsPerSecond: 20, circuitOpen: true });
  });

  it('swallows a Redis failure instead of crashing the interval', async () => {
    const broken = mock<Queue>({ name: 'poll' });

    broken.getJobCounts.mockRejectedValue(new Error('ECONNREFUSED'));

    const { prisma, stats } = createStats([broken]);

    await expect(stats.collect()).resolves.toBeUndefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
