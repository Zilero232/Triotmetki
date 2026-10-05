import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';

import type { PromoCode } from '../../../../generated';
import type { ClaimRedemptionInput, PromoCodeInput, RecordRedemptionInput, ReleaseReservationInput } from '../billing.types';

import { AppBadRequestException } from '../../../common/exceptions';
import { lockedTransaction, PrismaService } from '../../../core';
import { PROMO_REJECTION_CODE, PROMO_RESERVATION } from '../config/promo.constants';
import { SUBSCRIPTION_LOCK } from '../config/subscription-lock.constants';
import { promoRejection } from '../lib/promo-check/promo-check';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionWriterService } from './subscription-writer.service';

@Injectable()
export class PromoWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionWriterService,
    private readonly entitlements: EntitlementsService
  ) {}

  async usable({ userId, code }: PromoCodeInput): Promise<PromoCode> {
    const normalised = this.normalise(code);
    const [promo, redeemed] = await Promise.all([
      this.prisma.promoCode.findUnique({ where: { code: normalised } }),
      this.prisma.promoRedemption.findUnique({ where: { code_userId: { code: normalised, userId } } })
    ]);

    const now = new Date();
    const isHeld = redeemed !== null && !(redeemed.reservedUntil && redeemed.reservedUntil <= now);
    const rejection = promoRejection({ promo, now, alreadyRedeemed: isHeld });

    if (rejection || !promo) {
      const reason = rejection ?? 'unknown';

      throw new AppBadRequestException(PROMO_REJECTION_CODE[reason], `Promo code rejected: ${reason}`);
    }

    return promo;
  }

  async redeemFreeDays({ userId, code }: PromoCodeInput): Promise<void> {
    const promo = await this.usable({ userId, code });

    if (!promo.freeDays || promo.discountPercent) {
      throw new AppBadRequestException('PROMO_CHECKOUT_ONLY', 'This promo code is a checkout discount, pass it with the plan');
    }

    const days = promo.freeDays;
    const now = new Date();

    await lockedTransaction({
      prisma: this.prisma,
      scope: SUBSCRIPTION_LOCK.scope,
      key: userId,
      run: async (tx) => {
        await this.claimRedemption({ db: tx, userId, code: promo.code, now });
        await this.subscriptions.grantDays({ db: tx, userId, days, now });
      }
    });

    await this.entitlements.syncTracking(userId);
  }

  async reserve({ userId, code }: PromoCodeInput): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.release({ db: tx, userId, code, lapsedBy: now });
      await this.claimRedemption({ db: tx, userId, code, now, reservedUntil: addMinutes(now, PROMO_RESERVATION.minutes) });
    });
  }

  async confirm({ db, userId, code }: RecordRedemptionInput): Promise<void> {
    const confirmed = await db.promoRedemption.updateMany({ where: { code, userId, reservedUntil: { not: null } }, data: { reservedUntil: null } });

    if (confirmed.count === 0) {
      await this.recordRedemption({ db, userId, code });
    }
  }

  async release({ db, userId, code, lapsedBy }: ReleaseReservationInput): Promise<void> {
    const reservedUntil = lapsedBy ? { not: null, lte: lapsedBy } : { not: null };
    const released = await db.promoRedemption.deleteMany({ where: { code, userId, reservedUntil } });

    if (released.count > 0) {
      await db.promoCode.updateMany({ where: { code, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
  }

  async releaseExpired(): Promise<number> {
    const now = new Date();
    const lapsed = await this.prisma.promoRedemption.findMany({
      where: { reservedUntil: { not: null, lte: now } },
      select: { code: true, userId: true },
      take: PROMO_RESERVATION.releaseBatch
    });

    for (const { code, userId } of lapsed) {
      await this.prisma.$transaction(async (tx) => this.release({ db: tx, userId, code, lapsedBy: now }));
    }

    return lapsed.length;
  }

  private async claimRedemption({ db, userId, code, now, reservedUntil }: ClaimRedemptionInput): Promise<void> {
    const claimed = await db.promoCode.updateMany({
      where: {
        code,
        AND: [
          { OR: [{ maxUses: null }, { usedCount: { lt: db.promoCode.fields.maxUses } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        ]
      },
      data: { usedCount: { increment: 1 } }
    });

    if (claimed.count === 0) {
      throw new AppBadRequestException(PROMO_REJECTION_CODE.exhausted, 'Promo code rejected: exhausted');
    }

    const inserted = await db.promoRedemption.createMany({
      data: [reservedUntil ? { code, userId, reservedUntil } : { code, userId }],
      skipDuplicates: true
    });

    if (inserted.count === 0) {
      throw new AppBadRequestException(PROMO_REJECTION_CODE.alreadyRedeemed, 'Promo code rejected: alreadyRedeemed');
    }
  }

  private async recordRedemption({ db, userId, code }: RecordRedemptionInput): Promise<void> {
    const inserted = await db.promoRedemption.createMany({ data: [{ code, userId }], skipDuplicates: true });

    if (inserted.count > 0) {
      await db.promoCode.updateMany({
        where: { code, OR: [{ maxUses: null }, { usedCount: { lt: db.promoCode.fields.maxUses } }] },
        data: { usedCount: { increment: 1 } }
      });
    }
  }

  private normalise(code: string): string {
    return code.trim().toUpperCase();
  }
}
