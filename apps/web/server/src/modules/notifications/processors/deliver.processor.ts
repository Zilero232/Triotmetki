import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { NOTIFICATION_DELIVERY } from '../config/delivery.constants';
import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';
import { deliverPayloadSchema, digestPayloadSchema } from '../config/notifications-queue.schemas';
import { DeliveryService } from '../services/delivery.service';

@Processor(NOTIFICATIONS_QUEUE.deliver, { concurrency: NOTIFICATION_DELIVERY.concurrency })
export class DeliverProcessor extends TrackedWorkerHost<number> {
  constructor(
    private readonly delivery: DeliveryService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<number> {
    return match(job.name)
      .with(NOTIFICATIONS_JOB.deliver.digest, () => this.delivery.deliverDigest(digestPayloadSchema.parse(job.data)))
      .otherwise(() => this.delivery.deliver(deliverPayloadSchema.parse(job.data)));
  }
}
