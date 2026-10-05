import { Injectable, Logger } from '@nestjs/common';
import { addMilliseconds } from 'date-fns';

import type { DeliverInput, FailDeliveryInput } from '../developer.types';

import { errorMessage } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { WEBHOOK_DELIVERY } from '../config';
import { publicAddressOf, webhookHeaders, WebhookResponseError } from '../lib';
import { webhookEventFromDb } from '../mappers';
import { HostLookupService } from './host-lookup.service';
import { WebhookPosterService } from './webhook-poster.service';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hosts: HostLookupService,
    private readonly poster: WebhookPosterService
  ) {}

  async deliver({ deliveryId, attempt, isFinal }: DeliverInput): Promise<'delivered' | 'skipped'> {
    const delivery = await this.prisma.webhookDelivery.findUnique({ where: { id: deliveryId }, include: { endpoint: true } });
    const event = delivery ? webhookEventFromDb(delivery.event) : null;

    if (!delivery || delivery.status === 'succeeded') {
      return 'skipped';
    }

    if (!delivery.endpoint.isActive) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.inactiveEndpointResponse, nextAttemptAt: null }
      });

      return 'skipped';
    }

    if (!event) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.retiredEventResponse }
      });

      return 'skipped';
    }

    const body = JSON.stringify(delivery.payload);

    const address = await publicAddressOf({ url: delivery.endpoint.url, lookup: this.hosts.resolve });

    if (address === null) {
      await this.fail({
        deliveryId,
        endpointId: delivery.endpointId,
        attempt,
        responseStatus: null,
        responseBody: WEBHOOK_DELIVERY.blockedResponse,
        isFinal: true
      });

      this.logger.warn(`${WEBHOOK_DELIVERY.blockedResponse}: ${delivery.endpoint.url}`);

      return 'skipped';
    }

    try {
      const response = await this.poster.post({
        url: delivery.endpoint.url,
        address,
        body,
        headers: webhookHeaders({ secret: delivery.endpoint.secret, body, event, deliveryId, sentAt: new Date() }),
        timeoutMs: WEBHOOK_DELIVERY.timeoutMs,
        maxBodyBytes: WEBHOOK_DELIVERY.responseBodyMaxLength
      });

      await this.prisma.$transaction([
        this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'succeeded',
            attempt,
            responseStatus: response.status,
            responseBody: response.body.slice(0, WEBHOOK_DELIVERY.responseBodyMaxLength),
            deliveredAt: new Date(),
            nextAttemptAt: null
          }
        }),
        this.prisma.webhookEndpoint.update({ where: { id: delivery.endpointId }, data: { failureCount: 0 } })
      ]);

      return 'delivered';
    } catch (error) {
      const responseStatus = error instanceof WebhookResponseError ? error.response.status : null;
      const responseBody = error instanceof WebhookResponseError ? error.response.body : errorMessage(error);

      await this.fail({ deliveryId, endpointId: delivery.endpointId, attempt, responseStatus, responseBody, isFinal });

      throw error;
    }
  }

  private async fail({ deliveryId, endpointId, attempt, responseStatus, responseBody, isFinal }: FailDeliveryInput): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isFinal ? 'failed' : 'pending',
        attempt,
        responseStatus,
        responseBody: responseBody?.slice(0, WEBHOOK_DELIVERY.responseBodyMaxLength) ?? null,
        nextAttemptAt: isFinal ? null : addMilliseconds(new Date(), WEBHOOK_DELIVERY.backoffMs * 2 ** (attempt - 1))
      }
    });

    if (!isFinal) {
      return;
    }

    const endpoint = await this.prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { failureCount: { increment: 1 } } });

    if (endpoint.failureCount >= WEBHOOK_DELIVERY.disableAfterFailures) {
      await this.prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { isActive: false, disabledAt: new Date() } });
      this.logger.warn(`webhook endpoint ${endpointId} disabled after ${endpoint.failureCount} failed deliveries`);
    }
  }
}
