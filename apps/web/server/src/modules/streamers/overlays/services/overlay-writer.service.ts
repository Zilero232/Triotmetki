import type { Overlay as OverlayView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { Overlay } from '../../../../../generated';
import type {
  AssertAccountInput,
  CreateOverlayInput,
  OverlayData,
  OverlayViewInput,
  OwnedInput,
  PreviewOverlayRequest,
  UpdateOverlayInput
} from '../overlays.types';

import { AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { AppConfigService } from '../../../../config';
import { LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService } from '../../../../core';
import { EntitlementsService } from '../../../billing';
import { CosmeticsReaderService } from '../../../progression';
import { OVERLAY_KIND_TO_DB } from '../config/overlay.constants';
import { pausedOverlayIds } from '../lib/overlay-pause/overlay-pause';
import { toOverlayView } from '../mappers/overlay.mappers';
import { OverlayDataReaderService } from './overlay-data-reader.service';

@Injectable()
export class OverlayWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly data: OverlayDataReaderService,
    private readonly cosmetics: CosmeticsReaderService
  ) {}

  async list(userId: string): Promise<OverlayView[]> {
    const [overlays, paused] = await Promise.all([
      this.prisma.overlay.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.pausedIds(userId)
    ]);

    return overlays.map((overlay) => this.toView({ overlay, isPaused: paused.has(overlay.id) }));
  }

  async pausedIds(userId: string): Promise<Set<string>> {
    const [isPlus, overlays] = await Promise.all([
      this.entitlements.isPlus(userId),
      this.prisma.overlay.findMany({ where: { userId }, select: { id: true, createdAt: true } })
    ]);

    return pausedOverlayIds({ overlays, isPlus });
  }

  async create({ userId, name, kind, accountId, config }: CreateOverlayInput): Promise<OverlayView> {
    await this.assertAccount({ userId, accountId });
    await this.cosmetics.assertOverlayTheme({ userId, theme: config.theme });

    const overlay = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.overlays,
      key: userId,
      run: async (tx) => {
        const count = await tx.overlay.count({ where: { userId } });

        await this.entitlements.assertWithinLimit({ userId, key: 'overlays', count, feature: 'overlays' });

        return tx.overlay.create({
          data: {
            userId,
            name,
            kind: OVERLAY_KIND_TO_DB[kind],
            accountId: accountId === undefined ? null : BigInt(accountId),
            theme: config.theme,
            config
          }
        });
      }
    });

    return this.toView({ overlay, isPaused: false });
  }

  async update({ userId, id, name, kind, accountId, config }: UpdateOverlayInput): Promise<OverlayView> {
    await this.owned({ userId, id });
    await this.assertAccount({ userId, accountId });

    if (config !== undefined) {
      await this.cosmetics.assertOverlayTheme({ userId, theme: config.theme });
    }

    const overlay = await this.prisma.overlay.update({
      where: { id },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(kind === undefined ? {} : { kind: OVERLAY_KIND_TO_DB[kind] }),
        ...(accountId === undefined ? {} : { accountId: BigInt(accountId) }),
        ...(config === undefined ? {} : { config, theme: config.theme })
      }
    });

    return this.toView({ overlay, isPaused: (await this.pausedIds(userId)).has(overlay.id) });
  }

  async preview(input: PreviewOverlayRequest): Promise<OverlayData> {
    await this.assertAccount({ userId: input.userId, accountId: input.accountId });

    return this.data.preview(input);
  }

  async remove({ userId, id }: OwnedInput): Promise<void> {
    await this.owned({ userId, id });
    await this.prisma.overlay.delete({ where: { id } });
  }

  private toView({ overlay, isPaused }: OverlayViewInput): OverlayView {
    return toOverlayView({ overlay, isPaused, webUrl: this.config.get('WEB_URL') });
  }

  private async owned({ userId, id }: OwnedInput): Promise<Overlay> {
    const overlay = await this.prisma.overlay.findUnique({ where: { id } });

    if (!overlay || overlay.userId !== userId) {
      throw new AppNotFoundException('NOT_FOUND', `No overlay ${id}`);
    }

    return overlay;
  }

  private async assertAccount({ userId, accountId }: AssertAccountInput): Promise<void> {
    if (accountId === undefined) {
      return;
    }

    const owned = await this.prisma.userLestaAccount.count({ where: { userId, accountId: BigInt(accountId) } });

    if (owned === 0) {
      throw new AppForbiddenException('FORBIDDEN', 'The account is not linked to this user');
    }
  }
}
