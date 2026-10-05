import type { WebhookPayload } from '@otmetki/schemas';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

import type { EmitWebhookInput, WebhookEmitter } from '../../webhooks';

import { stableUuid, toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { JOB, QUEUE } from '../../collector';
import { WEBHOOK_DELIVERY, WEBHOOK_EVENT_TO_DB } from '../config';
import { matchesSubject } from '../lib';

@Injectable()
export class WebhookEmitterService implements WebhookEmitter {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.developerWebhooks) private readonly queue: Queue
  ) {}

  async emit({ event, subject, data, dedupeKey }: EmitWebhookInput): Promise<number> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { isActive: true, events: { has: WEBHOOK_EVENT_TO_DB[event] } },
      select: { id: true, filter: true }
    });

    const matched = endpoints.filter((endpoint) => matchesSubject({ filter: endpoint.filter, subject }));
    const createdAt = new Date().toISOString();

    const deliveries = matched.map((endpoint) => {
      const id = dedupeKey ? stableUuid(`${endpoint.id}:${event}:${dedupeKey}`) : randomUUID();
      const payload: WebhookPayload = { id, event, createdAt, data };

      return { id, endpointId: endpoint.id, event: WEBHOOK_EVENT_TO_DB[event], payload: toJsonValue(payload) };
    });

    if (deliveries.length === 0) {
      return 0;
    }

    await this.prisma.webhookDelivery.createMany({ data: deliveries, skipDuplicates: true });

    for (const { id } of deliveries) {
      await this.enqueue(id);
    }

    return deliveries.length;
  }

  async enqueue(deliveryId: string): Promise<void> {
    await this.queue.add(
      JOB.developerWebhooks.deliver,
      { deliveryId },
      { jobId: deliveryId, attempts: WEBHOOK_DELIVERY.maxAttempts, backoff: { type: 'exponential', delay: WEBHOOK_DELIVERY.backoffMs } }
    );
  }
}
