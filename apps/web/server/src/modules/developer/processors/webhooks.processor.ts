import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { JOB, QUEUE, webhookDeliverPayloadSchema, WORKER_CONCURRENCY } from '../../collector';
import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { SessionCloseService } from '../services/session-close.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { WebhookRedriveService } from '../services/webhook-redrive.service';

@Processor(QUEUE.developerWebhooks, { concurrency: WORKER_CONCURRENCY.developerWebhooks })
export class WebhooksProcessor extends TrackedWorkerHost {
  constructor(
    private readonly deliveries: WebhookDeliveryService,
    private readonly sessions: SessionCloseService,
    private readonly redrive: WebhookRedriveService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    if (job.name === JOB.developerWebhooks.closeSessions) {
      return { closed: await this.sessions.closeIdle() };
    }

    if (job.name === JOB.developerWebhooks.redrive) {
      return { requeued: await this.redrive.redrive() };
    }

    const { deliveryId } = webhookDeliverPayloadSchema.parse(job.data);
    const attempt = job.attemptsMade + 1;

    return { result: await this.deliveries.deliver({ deliveryId, attempt, isFinal: attempt >= (job.opts.attempts ?? 1) }) };
  }
}
