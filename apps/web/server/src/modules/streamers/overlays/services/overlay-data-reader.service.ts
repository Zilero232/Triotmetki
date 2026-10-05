import type { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { overlayConfigSchema, plusLimit } from '@otmetki/schemas';

import type { Overlay } from '../../../../../generated';
import type { OverlayData, PreviewOverlayRequest } from '../overlays.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { EntitlementsService } from '../../../billing';
import { CosmeticsReaderService } from '../../../progression';
import { OVERLAY, OVERLAY_KIND_FROM_DB } from '../config/overlay.constants';
import { OverlayStatsReaderService } from './overlay-stats-reader.service';

@Injectable()
export class OverlayDataReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: OverlayStatsReaderService,
    private readonly entitlements: EntitlementsService,
    private readonly cosmetics: CosmeticsReaderService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ) {}

  async find(publicKey: string): Promise<Overlay> {
    const overlay = await this.prisma.overlay.findUnique({ where: { publicKey } });

    if (!overlay) {
      throw new AppNotFoundException('NOT_FOUND', 'No such overlay');
    }

    return overlay;
  }

  async cached(publicKey: string): Promise<OverlayData> {
    const key = `${OVERLAY.cacheKeyPrefix}${publicKey}`;
    const hit = await this.cache.get<OverlayData>(key);

    if (hit) {
      return hit;
    }

    const data = await this.compute(await this.find(publicKey));

    await this.cache.set(key, data, OVERLAY.cacheTtlMs);

    return data;
  }

  async accountOf(overlay: Overlay): Promise<bigint | null> {
    return overlay.accountId ?? this.profileAccount(overlay.userId);
  }

  async compute(overlay: Overlay): Promise<OverlayData> {
    const stored = overlayConfigSchema.parse(overlay.config);
    const config = { ...stored, theme: await this.cosmetics.effectiveOverlayTheme({ userId: overlay.userId, theme: stored.theme }) };
    const kind = OVERLAY_KIND_FROM_DB[overlay.kind];

    if (await this.isPaused(overlay)) {
      return {
        kind,
        name: overlay.name,
        config,
        isPaused: true,
        player: null,
        session: null,
        overall: null,
        moe: null,
        challenge: null,
        updatedAt: new Date().toISOString()
      };
    }

    return this.stats.build({
      userId: overlay.userId,
      accountId: await this.accountOf(overlay),
      kind,
      name: overlay.name,
      config
    });
  }

  async isPaused(overlay: Overlay): Promise<boolean> {
    if (await this.entitlements.isPlus(overlay.userId)) {
      return false;
    }

    const older = await this.prisma.overlay.count({
      where: {
        userId: overlay.userId,
        OR: [{ createdAt: { lt: overlay.createdAt } }, { createdAt: overlay.createdAt, id: { lt: overlay.id } }]
      }
    });

    return older >= plusLimit({ key: 'overlays', isPlus: false });
  }

  async preview({ userId, accountId, kind, name, config }: PreviewOverlayRequest): Promise<OverlayData> {
    return this.stats.build({
      userId,
      accountId: accountId === undefined ? await this.profileAccount(userId) : BigInt(accountId),
      kind,
      name: name ?? '',
      config
    });
  }

  private async profileAccount(userId: string): Promise<bigint | null> {
    const profile = await this.prisma.streamerProfile.findUnique({ where: { userId }, select: { accountId: true } });

    return profile?.accountId ?? null;
  }
}
