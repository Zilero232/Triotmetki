import type { CosmeticsInventory } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { cosmeticOf, isPurchasableCosmetic, PROFILE_COSMETIC_SLOTS } from '@otmetki/schemas';

import type { EquipCosmeticsRequest, PurchaseCosmeticInput } from '../progression.types';

import { AppBadRequestException, AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { lockedTransaction, PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { SHELL_LEDGER } from '../config/shell-ledger.constants';
import { isCosmeticUsable } from '../lib/cosmetic-access/cosmetic-access';
import { purchaseKey } from '../lib/ledger-keys/ledger-keys';
import { toCosmeticColumns } from '../mappers/equipped-cosmetics.mappers';
import { CosmeticsReaderService } from './cosmetics-reader.service';
import { ShellLedgerWriterService } from './shell-ledger-writer.service';

@Injectable()
export class CosmeticsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly ledger: ShellLedgerWriterService,
    private readonly reader: CosmeticsReaderService
  ) {}

  async purchase({ userId, code }: PurchaseCosmeticInput): Promise<CosmeticsInventory> {
    const item = cosmeticOf(code);

    if (!item) {
      throw new AppNotFoundException('NOT_FOUND', `No cosmetic ${code}`);
    }

    if (!isPurchasableCosmetic(item) || item.price === null) {
      throw new AppBadRequestException('VALIDATION_FAILED', `${code} cannot be bought`);
    }

    await this.entitlements.assertFeature({ userId, feature: 'cosmetics' });

    const price = item.price;

    await lockedTransaction({
      prisma: this.prisma,
      scope: SHELL_LEDGER.lockScope,
      key: userId,
      run: async (tx) => {
        const owned = await tx.cosmeticOwnership.findUnique({ where: { userId_code: { userId, code } } });

        if (owned) {
          throw new AppConflictException('CONFLICT', `${code} is already owned`);
        }

        await this.ledger.spend({ userId, amount: price, key: purchaseKey({ userId, code }), context: { code }, tx });
        await tx.cosmeticOwnership.create({ data: { userId, code, grant: 'purchase' } });
      }
    });

    return this.reader.inventory(userId);
  }

  async equip({ userId, ...patch }: EquipCosmeticsRequest): Promise<CosmeticsInventory> {
    const [isPlus, owned] = await Promise.all([
      this.entitlements.isPlus(userId),
      this.prisma.cosmeticOwnership.findMany({ where: { userId }, select: { code: true } })
    ]);

    const ownedCodes = new Set(owned.map((row) => row.code));

    for (const slot of PROFILE_COSMETIC_SLOTS) {
      const code = patch[slot];

      if (code === undefined || code === null) {
        continue;
      }

      const item = cosmeticOf(code);

      if (item?.slot !== slot) {
        throw new AppBadRequestException('VALIDATION_FAILED', `${code} does not fit the ${slot} slot`);
      }

      if (!isCosmeticUsable({ item, isOwned: ownedCodes.has(code), isPlus })) {
        throw item.source === 'plus'
          ? new AppForbiddenException('SUBSCRIPTION_REQUIRED', `${code} needs Plus`, { feature: 'cosmetics' })
          : new AppForbiddenException('FORBIDDEN', `${code} is not owned`);
      }
    }

    await this.prisma.user.update({ where: { id: userId }, data: toCosmeticColumns(patch) });

    return this.reader.inventory(userId);
  }
}
