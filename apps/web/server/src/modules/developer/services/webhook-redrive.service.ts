import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { subMinutes } from 'date-fns';

import { PrismaService } from '../../../core';
import { QUEUE } from '../../collector';
import { WEBHOOK_DELIVERY } from '../config';
import { WebhookEmitterService } from './webhook-emitter.service';

@Injectable()
export class WebhookRedriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: WebhookEmitterService,
    @InjectQueue(QUEUE.developerWebhooks) private readonly queue: Queue
  ) {}

  async redrive(now = new Date()): Promise<number> {
    const stale = subMinutes(now, WEBHOOK_DELIVERY.redriveAfterMinutes);

    await this.prisma.webhookDelivery.updateMany({
      where: { status: 'pending', endpoint: { isActive: false } },
      data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.inactiveEndpointResponse, nextAttemptAt: null }
    });

    const stuck = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: stale },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lt: stale } }],
        endpoint: { isActive: true }
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      take: WEBHOOK_DELIVERY.redriveBatch
    });

    let requeued = 0;

    for (const { id } of stuck) {
      const job = await this.queue.getJob(id);
      const state = job ? await job.getState() : null;

      if (state !== null && state !== 'completed' && state !== 'failed' && state !== 'unknown') {
        continue;
      }

      await job?.remove();
      await this.emitter.enqueue(id);
      requeued += 1;
    }

    return requeued;
  }
}
