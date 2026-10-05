import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { SESSION_SHARE_QUEUE } from '../config/session-share-queue.constants';
import { sessionSharePayloadSchema } from '../config/session-share-queue.schemas';
import { SessionShareDeliveryService } from '../services/session-share-delivery.service';

@Processor(SESSION_SHARE_QUEUE.name, { concurrency: SESSION_SHARE_QUEUE.concurrency })
export class SessionShareProcessor extends TrackedWorkerHost<boolean> {
  constructor(
    private readonly delivery: SessionShareDeliveryService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected handle(job: Job): Promise<boolean> {
    return this.delivery.deliver(sessionSharePayloadSchema.parse(job.data));
  }
}
