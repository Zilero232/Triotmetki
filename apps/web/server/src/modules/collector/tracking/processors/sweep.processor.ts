import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import { match } from 'ts-pattern';

import type { CircuitStateName } from '../../metrics';

import { errorMessage } from '../../../../common/lib';
import { WORKER_CONCURRENCY } from '../../config';
import { accountBatchPayloadSchema, JOB, QUEUE } from '../../contracts';
import { CIRCUIT_BREAKER, CircuitBreakerService, MetricsService } from '../../metrics';
import { DispatchService } from '../services/dispatch.service';
import { PollSyncService } from '../services/poll-sync.service';
import { SeedService } from '../services/seed.service';

@Processor(QUEUE.sweep, { concurrency: WORKER_CONCURRENCY.sweep })
export class SweepProcessor extends WorkerHost implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SweepProcessor.name);
  private pausedByBreaker = false;
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly pipeline: PollSyncService,
    private readonly dispatch: DispatchService,
    private readonly seeder: SeedService,
    private readonly breaker: CircuitBreakerService,
    private readonly metrics: MetricsService
  ) {
    super();
  }

  onModuleInit() {
    this.unsubscribe = this.breaker.onChange((state) => this.onCircuit(state));
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  async process(job: Job, token?: string) {
    if (job.name === JOB.sweep.batch && this.breaker.isOpen()) {
      await job.moveToDelayed(Date.now() + CIRCUIT_BREAKER.halfOpenAfterMs, token);

      throw new DelayedError();
    }

    return this.metrics.track({
      job,
      run: () =>
        match<string, Promise<unknown>>(job.name)
          .with(JOB.sweep.dispatch, async () => ({ dispatched: await this.dispatch.dispatchSweep('population') }))
          .with(JOB.sweep.dormantDispatch, async () => ({ dispatched: await this.dispatch.dispatchSweep('dormant') }))
          .with(JOB.sweep.seed, () => this.seeder.seed())
          .otherwise(() => this.pipeline.run({ accountIds: accountBatchPayloadSchema.parse(job.data).accountIds, lane: 'bulk', tier: 'population' }))
    });
  }

  private onCircuit(state: CircuitStateName) {
    if (state === 'open' && !this.pausedByBreaker) {
      this.pausedByBreaker = true;
      this.logger.warn('Lesta degraded: pausing tier B');

      void this.worker.pause(true).catch((error: unknown) => {
        this.logger.warn(`tier B not paused: ${errorMessage(error)}`);
      });

      return;
    }

    if (state !== 'open' && this.pausedByBreaker) {
      this.pausedByBreaker = false;
      this.logger.log('Lesta recovered: resuming tier B');
      this.worker.resume();
    }
  }
}
