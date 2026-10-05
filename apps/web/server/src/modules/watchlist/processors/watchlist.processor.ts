import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { WATCHLIST_QUEUE } from '../config/queue.constants';
import { WatchlistDigestService } from '../services/watchlist-digest.service';

@Processor(WATCHLIST_QUEUE.name, { concurrency: 1 })
export class WatchlistProcessor extends TrackedWorkerHost {
  constructor(
    private readonly digests: WatchlistDigestService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(WATCHLIST_QUEUE.jobs.digest, () => this.digests.run(new Date()))
      .otherwise(() => null);
  }
}
