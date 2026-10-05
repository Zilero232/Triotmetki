import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { MetricsService } from '../services/metrics.service';

export abstract class TrackedWorkerHost<T = unknown> extends WorkerHost {
  constructor(protected readonly metrics: MetricsService) {
    super();
  }

  async process(job: Job): Promise<T> {
    return this.metrics.track({ job, run: () => this.handle(job) });
  }

  protected abstract handle(job: Job): Promise<T>;
}
