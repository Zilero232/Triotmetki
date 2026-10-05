import type { CosmeticsInventory, OverlayTheme, ProfileCosmetics } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { catalogCosmetics, cosmeticOf, OVERLAY_THEMES, overlayThemeCosmetic } from '@otmetki/schemas';
import { unique } from 'remeda';

import type { OverlayThemeInput } from '../progression.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { entitledSubscriptionWhere, EntitlementsService } from '../../billing';
import { NO_COSMETICS } from '../config/cosmetics.constants';
import { isCosmeticUsable, visibleCosmetics } from '../lib/cosmetic-access/cosmetic-access';
import { toEquippedCosmetics } from '../mappers/equipped-cosmetics.mappers';
import { EQUIPPED_COSMETICS_SELECT } from '../selects/equipped-cosmetics.selects';
import { ShellLedgerWriterService } from './shell-ledger-writer.service';

@Injectable()
export class CosmeticsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly ledger: ShellLedgerWriterService
  ) {}

  async inventory(userId: string): Promise<CosmeticsInventory> {
    const [isPlus, balance, owned, equipped] = await Promise.all([
      this.entitlements.isPlus(userId),
      this.ledger.balance(userId),
      this.prisma.cosmeticOwnership.findMany({ where: { userId }, orderBy: { acquiredAt: 'asc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: EQUIPPED_COSMETICS_SELECT })
    ]);

    const acquired = new Map(owned.map((row) => [row.code, row.acquiredAt]));
    const seasonal = owned.flatMap((row) => {
      const item = cosmeticOf(row.code);

      return item?.source === 'season' ? [item] : [];
    });

    return {
      isPlus,
      balance,
      equipped: equipped ? toEquippedCosmetics(equipped) : NO_COSMETICS,
      items: [...catalogCosmetics(), ...seasonal].map((item) => {
        const acquiredAt = acquired.get(item.code) ?? null;

        return {
          ...item,
          isOwned: acquiredAt !== null || item.source === 'default',
          isUsable: isCosmeticUsable({ item, isOwned: acquiredAt !== null, isPlus }),
          acquiredAt: acquiredAt?.toISOString() ?? null
        };
      })
    };
  }

  async profile(accountId: number): Promise<ProfileCosmetics> {
    const [result] = await this.profiles([accountId]);

    return result ?? { accountId, ...NO_COSMETICS };
  }

  async profiles(accountIds: readonly number[]): Promise<ProfileCosmetics[]> {
    const ids = unique(accountIds);
    const links = await this.prisma.userLestaAccount.findMany({
      where: { accountId: { in: ids.map((id) => BigInt(id)) } },
      select: { accountId: true, userId: true }
    });

    const userIds = unique(links.map((link) => link.userId));
    const [equipped, owned, entitled] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          OR: [{ cosmeticBadge: { not: null } }, { cosmeticFrame: { not: null } }, { cosmeticBanner: { not: null } }]
        },
        select: { id: true, ...EQUIPPED_COSMETICS_SELECT }
      }),
      this.prisma.cosmeticOwnership.findMany({ where: { userId: { in: userIds } }, select: { userId: true, code: true } }),
      this.prisma.subscription.findMany({ where: { ...entitledSubscriptionWhere(new Date()), userId: { in: userIds } }, select: { userId: true } })
    ]);

    const plusUsers = new Set(entitled.map((row) => row.userId));
    const equippedOf = new Map(equipped.map((row) => [row.id, toEquippedCosmetics(row)]));

    return links.flatMap((link) => {
      const row = equippedOf.get(link.userId);

      if (!row) {
        return [];
      }

      const visible = visibleCosmetics({
        equipped: row,
        owned: new Set(owned.filter((item) => item.userId === link.userId).map((item) => item.code)),
        isPlus: plusUsers.has(link.userId)
      });

      return [{ accountId: toNumber(link.accountId), ...visible }];
    });
  }

  async assertOverlayTheme({ userId, theme }: OverlayThemeInput): Promise<void> {
    const code = overlayThemeCosmetic(theme);

    if (code === null) {
      return;
    }

    await this.entitlements.assertFeature({ userId, feature: 'overlays' });

    if (!(await this.canUseTheme({ userId, theme }))) {
      throw new AppForbiddenException('FORBIDDEN', `The ${theme} overlay theme is not owned`);
    }
  }

  async effectiveOverlayTheme({ userId, theme }: OverlayThemeInput): Promise<OverlayTheme> {
    return (await this.canUseTheme({ userId, theme })) ? theme : OVERLAY_THEMES.fallback;
  }

  private async canUseTheme({ userId, theme }: OverlayThemeInput): Promise<boolean> {
    const code = overlayThemeCosmetic(theme);
    const item = code === null ? null : cosmeticOf(code);

    if (code === null || item === null) {
      return true;
    }

    const [isPlus, owned] = await Promise.all([this.entitlements.isPlus(userId), this.prisma.cosmeticOwnership.count({ where: { userId, code } })]);

    return isPlus && isCosmeticUsable({ item, isOwned: owned > 0, isPlus });
  }
}
