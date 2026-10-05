import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ApiTier, ApiTiers } from '@otmetki/schemas';
import type { Subscription } from 'rxjs';

import { Injectable } from '@nestjs/common';
import { apiTierSchema } from '@otmetki/schemas';
import { LRUCache } from 'lru-cache';

import { PrismaService } from '../../../core';
import { EntitlementsBusService, EntitlementsService } from '../../billing';
import { API_KEY_POLICY, API_TIERS } from '../config/api-keys.constants';
import { keyTierOf } from '../lib/api-key/api-key';

@Injectable()
export class ApiTierReaderService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new LRUCache<string, ApiTier>({ max: API_KEY_POLICY.tierCacheMaxEntries, ttl: API_KEY_POLICY.tierCacheTtlMs });
  private subscription: Subscription | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly bus: EntitlementsBusService
  ) {}

  onModuleInit(): void {
    this.subscription = this.bus.changes$.subscribe(({ userId }) => {
      this.forget(userId);
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  forget(userId: string): void {
    this.cache.delete(userId);
  }

  tiers(): ApiTiers {
    return apiTierSchema.options.map((tier) => ({ tier, limits: API_TIERS[tier] }));
  }

  async tierFor(userId: string): Promise<ApiTier> {
    const [keys, isPlus] = await Promise.all([
      this.prisma.apiKey.findMany({ where: { referenceId: userId, enabled: true }, select: { metadata: true } }),
      this.entitlements.isPlus(userId)
    ]);

    const tier = keys.some(({ metadata }) => keyTierOf(metadata) === 'community') ? 'community' : isPlus ? 'plus' : 'free';

    this.cache.set(userId, tier);

    return tier;
  }

  async cachedTierFor(userId: string): Promise<ApiTier> {
    return this.cache.get(userId) ?? this.tierFor(userId);
  }
}
