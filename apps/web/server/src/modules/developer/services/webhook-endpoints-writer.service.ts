import type { CreatedWebhookEndpoint, WebhookDelivery, WebhookEndpoint } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { ApplyTierInput, CreateEndpointInput, OwnedKeyInput, UpdateEndpointInput } from '../developer.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService } from '../../../core';
import { API_TIERS } from '../config/api-keys.constants';
import { WEBHOOK_DELIVERY } from '../config/webhook-delivery.constants';
import { WEBHOOK_EVENT_TO_DB } from '../config/webhook-events.constants';
import { generateWebhookSecret } from '../lib/webhook-signature/webhook-signature';
import { resolvesPublicly } from '../lib/webhook-url/webhook-url';
import { toWebhookDelivery, toWebhookEndpoint } from '../mappers/webhooks.mappers';
import { ApiTierReaderService } from './api-tier-reader.service';
import { HostLookupService } from './host-lookup.service';

@Injectable()
export class WebhookEndpointsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: ApiTierReaderService,
    private readonly hosts: HostLookupService
  ) {}

  async list(userId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.prisma.webhookEndpoint.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    return rows.map(toWebhookEndpoint);
  }

  async create({ userId, url, events, filter }: CreateEndpointInput): Promise<CreatedWebhookEndpoint> {
    await this.assertPublic(url);

    const tier = await this.tiers.tierFor(userId);
    const limit = API_TIERS[tier].webhooks;
    const secret = generateWebhookSecret();

    const row = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.webhooks,
      key: userId,
      run: async (tx) => {
        if ((await tx.webhookEndpoint.count({ where: { userId } })) >= limit) {
          throw new AppConflictException('PLAN_LIMIT_REACHED', `The ${tier} tier allows ${limit} webhook endpoint(s)`, {
            feature: 'apiLimits',
            limit
          });
        }

        return tx.webhookEndpoint.create({ data: { userId, url, secret, events: events.map((event) => WEBHOOK_EVENT_TO_DB[event]), filter } });
      }
    });

    return { endpoint: toWebhookEndpoint(row), secret };
  }

  async update({ userId, id, url, events, filter, isActive }: UpdateEndpointInput): Promise<WebhookEndpoint> {
    await this.owned({ userId, id });

    if (url !== undefined) {
      await this.assertPublic(url);
    }

    if (isActive) {
      await this.assertActiveRoom({ userId, id });
    }

    const row = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(url === undefined ? {} : { url }),
        ...(events === undefined ? {} : { events: events.map((event) => WEBHOOK_EVENT_TO_DB[event]) }),
        ...(filter === undefined ? {} : { filter }),
        ...(isActive === undefined ? {} : { isActive, ...(isActive ? { failureCount: 0, disabledAt: null } : {}) })
      }
    });

    return toWebhookEndpoint(row);
  }

  async remove({ userId, id }: OwnedKeyInput): Promise<void> {
    await this.owned({ userId, id });
    await this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async deliveries({ userId, id }: OwnedKeyInput): Promise<WebhookDelivery[]> {
    await this.owned({ userId, id });

    const rows = await this.prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: WEBHOOK_DELIVERY.deliveriesShown
    });

    return rows.flatMap(toWebhookDelivery);
  }

  async enforceTier({ userId, tier }: ApplyTierInput): Promise<number> {
    const active = await this.prisma.webhookEndpoint.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    const over = active.slice(API_TIERS[tier].webhooks).map((endpoint) => endpoint.id);

    if (over.length === 0) {
      return 0;
    }

    const { count } = await this.prisma.webhookEndpoint.updateMany({
      where: { id: { in: over } },
      data: { isActive: false, disabledAt: new Date() }
    });

    return count;
  }

  private async assertActiveRoom({ userId, id }: OwnedKeyInput): Promise<void> {
    const [tier, active] = await Promise.all([
      this.tiers.tierFor(userId),
      this.prisma.webhookEndpoint.count({ where: { userId, isActive: true, id: { not: id } } })
    ]);

    const limit = API_TIERS[tier].webhooks;

    if (active >= limit) {
      throw new AppConflictException('PLAN_LIMIT_REACHED', `The ${tier} tier allows ${limit} active webhook endpoint(s)`, {
        feature: 'apiLimits',
        limit
      });
    }
  }

  private async assertPublic(url: string): Promise<void> {
    if (!(await resolvesPublicly({ url, lookup: this.hosts.resolve }))) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'A webhook must point to a public https address');
    }
  }

  private async owned({ userId, id }: OwnedKeyInput) {
    const row = await this.prisma.webhookEndpoint.findFirst({ where: { id, userId }, select: { id: true } });

    if (!row) {
      throw new AppNotFoundException('NOT_FOUND', 'Webhook endpoint not found');
    }

    return row;
  }
}
