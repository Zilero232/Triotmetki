import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { WORKER_CONCURRENCY } from '../../config';
import { accountBatchPayloadSchema, clanDispatchPayloadSchema, clanRefreshPayloadSchema, JOB, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { ClanDispatchService } from '../services/clan-dispatch.service';
import { ClanHistorySyncService } from '../services/clan-history-sync.service';
import { ClanSyncService } from '../services/clan-sync.service';

@Processor(QUEUE.clans, { concurrency: WORKER_CONCURRENCY.clans })
export class ClansProcessor extends TrackedWorkerHost {
  constructor(
    private readonly dispatcher: ClanDispatchService,
    private readonly sync: ClanSyncService,
    private readonly history: ClanHistorySyncService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    return match<string, Promise<unknown>>(job.name)
      .with(JOB.clans.dispatch, async () => ({ dispatched: await this.dispatcher.dispatch(clanDispatchPayloadSchema.parse(job.data)) }))
      .with(JOB.clans.history, () => this.history.history(accountBatchPayloadSchema.parse(job.data)))
      .otherwise(() => this.sync.refresh(clanRefreshPayloadSchema.parse(job.data)));
  }
}
