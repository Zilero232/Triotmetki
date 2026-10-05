import { Processor } from '@nestjs/bullmq';

import { WORKER_CONCURRENCY } from '../../config';
import { QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { NewsSyncService } from '../services/news-sync.service';

@Processor(QUEUE.news, { concurrency: WORKER_CONCURRENCY.news })
export class NewsProcessor extends TrackedWorkerHost {
  constructor(
    private readonly news: NewsSyncService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle() {
    return this.news.sync();
  }
}
