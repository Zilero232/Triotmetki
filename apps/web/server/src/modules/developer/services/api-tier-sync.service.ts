import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ApiTier } from '@otmetki/schemas';
import type { Subscription } from 'rxjs';

import { Injectable, Logger } from '@nestjs/common';

import type { ApplyTierInput } from '../developer.types';

import { errorMessage } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsBusService } from '../../billing';
import { keyTierOf, tierMetadata } from '../lib';
import { ApiTierService } from './api-tier.service';
import { WebhookEndpointsService } from './webhook-endpoints.service';

@Injectable()
export class ApiTierSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApiTierSyncService.name);
  private subscription: Subscription | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: ApiTierService,
    private readonly webhooks: WebhookEndpointsService,
    private readonly bus: EntitlementsBusService
  ) {}

  onModuleInit(): void {
    this.subscription = this.bus.changes$.subscribe(({ userId, isLocal }) => {
      if (isLocal) {
        void this.sync(userId).catch((error: unknown) => {
          this.logger.warn(`API tier of ${userId} not synced after a billing change: ${errorMessage(error)}`);
        });
      }
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async sync(userId: string): Promise<ApiTier> {
    this.tiers.forget(userId);

    const tier = await this.tiers.tierFor(userId);

    await this.apply({ userId, tier });

    return tier;
  }

  async apply({ userId, tier }: ApplyTierInput): Promise<void> {
    const keys = await this.prisma.apiKey.findMany({
      where: { referenceId: userId, enabled: true },
      select: { id: true, metadata: true, remaining: true, refillAmount: true }
    });

    for (const key of keys.filter(
      ({ metadata, remaining, refillAmount }) => keyTierOf(metadata) !== tier || remaining !== null || refillAmount !== null
    )) {
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { metadata: JSON.stringify(tierMetadata(tier)), remaining: null, refillAmount: null, refillInterval: null }
      });
    }

    await this.webhooks.enforceTier({ userId, tier });
  }
}
