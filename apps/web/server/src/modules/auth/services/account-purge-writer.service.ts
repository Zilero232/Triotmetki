import { Injectable } from '@nestjs/common';

import type { AccountPurgeStore } from '../../../lib/auth';
import type { Owned } from '../../community-core';

import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { PurgeGuardService } from '../../collector';
import { CommunityContentWriterService } from '../../community-core';
import { ACCOUNT_PURGE } from '../config/account-purge.constants';

@Injectable()
export class AccountPurgeWriterService implements AccountPurgeStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communityContent: CommunityContentWriterService,
    private readonly entitlements: EntitlementsService,
    private readonly purgeGuard: PurgeGuardService
  ) {}

  async purgeAccount({ userId }: Owned): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.communityContent.purgeAuthoredBy({ userId, db: tx });

      await tx.subscription.updateMany({
        where: { userId },
        data: { status: 'canceled', cancelAtPeriodEnd: true, savedCardId: null, savedCardTitle: null }
      });

      await tx.apiKey.deleteMany({ where: { referenceId: userId } });
      await tx.webhookEndpoint.deleteMany({ where: { userId } });
      await tx.overlay.deleteMany({ where: { userId } });
      await tx.streamerIntegration.deleteMany({ where: { userId } });
      await tx.streamerProfile.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.notificationSettings.deleteMany({ where: { userId } });
      await tx.telegramAccount.deleteMany({ where: { userId } });
      await tx.modSyncLibrary.deleteMany({ where: { userId } });
      await tx.modDevice.deleteMany({ where: { userId } });

      const links = await tx.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } });

      await this.purgeGuard.open({
        db: tx,
        accountIds: links.map((link) => link.accountId),
        source: 'user',
        reason: ACCOUNT_PURGE.deletionReason
      });

      await tx.userLestaAccount.deleteMany({ where: { userId } });
    });

    this.entitlements.invalidate(userId);
  }
}
