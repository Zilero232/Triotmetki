import { Injectable } from '@nestjs/common';
import { REFERRAL } from '@otmetki/schemas';

import type { RegisterReferralInput, RewardReferralInput } from '../billing.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { isUniqueViolation, PrismaService } from '../../../core';
import { SubscriptionWriterService } from './subscription-writer.service';

@Injectable()
export class ReferralWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionWriterService
  ) {}

  async register({ userId, referrerId }: RegisterReferralInput): Promise<void> {
    if (userId === referrerId) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'A user cannot refer themselves');
    }

    const [referrer, paid] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: referrerId }, select: { id: true } }),
      this.prisma.payment.count({ where: { userId, status: 'succeeded' } })
    ]);

    if (!referrer) {
      throw new AppNotFoundException('NOT_FOUND', 'Unknown referrer');
    }

    if (paid > 0) {
      throw new AppConflictException('CONFLICT', 'Only a user who has never paid can be referred');
    }

    try {
      await this.prisma.referral.create({ data: { referredUserId: userId, referrerUserId: referrerId } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'This user is already referred');
      }

      throw error;
    }
  }

  async reward({ db, userId, now }: RewardReferralInput): Promise<string | null> {
    const referral = await db.referral.findUnique({ where: { referredUserId: userId } });

    if (!referral || referral.rewardedAt) {
      return null;
    }

    const claimed = await db.referral.updateMany({ where: { referredUserId: userId, rewardedAt: null }, data: { rewardedAt: now } });

    if (claimed.count === 0) {
      return null;
    }

    await this.subscriptions.grantDays({ db, userId: referral.referrerUserId, days: REFERRAL.bonusDays, now });

    return referral.referrerUserId;
  }
}
