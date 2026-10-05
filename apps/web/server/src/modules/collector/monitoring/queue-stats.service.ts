import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { differenceInSeconds, startOfMinute } from 'date-fns';

import type { QueueSample, SampleQueueInput } from './monitoring.types';

import { errorMessage } from '../../../common/lib';
import { AppConfigService, LESTA } from '../../../config';
import { bulkRequestsPerSecond, PrismaService } from '../../../core';
import { COLLECTOR_STATE_KEY } from '../config';
import { CircuitBreakerService } from '../metrics';
import { QueueRegistryService } from '../queues';
import { MONITORING } from './config/monitoring.constants';

@Injectable()
export class QueueStatsService {
  private readonly logger = new Logger(QueueStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: QueueRegistryService,
    private readonly breaker: CircuitBreakerService,
    private readonly config: AppConfigService
  ) {}

  @Interval(MONITORING.queueStatsIntervalMs)
  async collect() {
    try {
      await this.write();
    } catch (error) {
      this.logger.warn(`queue stats failed: ${errorMessage(error)}`);
    }
  }

  private async write() {
    const now = new Date();
    const bucketStart = startOfMinute(now);
    const samples = await Promise.all(this.registry.all().map((queue) => this.sample({ queue, now })));
    const requestsPerSecond = this.config.get('LESTA_RPS');

    const budget = {
      requestsPerSecond,
      reserve: LESTA.tierAReserve,
      bulkRequestsPerSecond: bulkRequestsPerSecond({ requestsPerSecond, reserve: LESTA.tierAReserve }),
      circuitOpen: this.breaker.isOpen()
    };

    const snapshot = {
      collectedAt: now.toISOString(),
      queues: Object.fromEntries(samples.map(({ name, counts, lagSeconds }) => [name, { ...counts, lagSeconds }]))
    };

    await this.prisma.$transaction([
      ...samples.map(({ name, lagSeconds, queueDepth }) =>
        this.prisma.collectorJobMetric.upsert({
          where: { queue_bucketStart: { queue: name, bucketStart } },
          create: { queue: name, bucketStart, lagSeconds, queueDepth },
          update: { lagSeconds, queueDepth }
        })
      ),
      this.prisma.collectorState.upsert({
        where: { key: COLLECTOR_STATE_KEY.queues },
        create: { key: COLLECTOR_STATE_KEY.queues, value: snapshot },
        update: { value: snapshot }
      }),
      this.prisma.collectorState.upsert({
        where: { key: COLLECTOR_STATE_KEY.lestaBudget },
        create: { key: COLLECTOR_STATE_KEY.lestaBudget, value: budget },
        update: { value: budget }
      })
    ]);
  }

  private async sample({ queue, now }: SampleQueueInput): Promise<QueueSample> {
    const [counts, [oldest]] = await Promise.all([
      queue.getJobCounts(...MONITORING.countedStates),
      queue.getJobs([...MONITORING.waitingStates], 0, 0, true)
    ]);

    return {
      name: queue.name,
      counts,
      lagSeconds: oldest ? Math.max(0, differenceInSeconds(now, oldest.timestamp, { roundingMethod: 'round' })) : 0,
      queueDepth: (counts.waiting ?? 0) + (counts.prioritized ?? 0) + (counts.delayed ?? 0)
    };
  }
}
