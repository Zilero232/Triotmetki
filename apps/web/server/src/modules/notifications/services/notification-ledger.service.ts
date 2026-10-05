import { Injectable, Logger } from '@nestjs/common';
import { subMilliseconds } from 'date-fns';

import type { ClaimNotificationInput, NotificationClaim, SendOnceInput } from '../notifications.types';

import { errorMessage } from '../../../common/lib';
import { isUniqueViolation, PrismaService } from '../../../core';
import { NOTIFICATION_LEDGER } from '../config/delivery.constants';

@Injectable()
export class NotificationLedgerService {
  private readonly logger = new Logger(NotificationLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendOnce({ send, ...input }: SendOnceInput): Promise<boolean> {
    const claim = await this.claim(input);

    if (claim.status === 'sent') {
      return false;
    }

    if (claim.status === 'inFlight') {
      throw new Error(`${input.channel} delivery of ${input.dedupeKey} to ${input.userId} is in flight elsewhere`);
    }

    const { id } = claim;

    try {
      await send();
    } catch (error) {
      await this.prisma.notification.update({ where: { id }, data: { failedAt: new Date(), claimedAt: null } });
      this.logger.warn(`${input.channel} delivery of ${input.dedupeKey} to ${input.userId} failed: ${errorMessage(error)}`);

      throw error;
    }

    await this.prisma.notification.update({ where: { id }, data: { sentAt: new Date(), failedAt: null } });

    return true;
  }

  private async claim({ userId, channel, dedupeKey, notification, rendered }: ClaimNotificationInput): Promise<NotificationClaim> {
    const now = new Date();
    const existing = await this.prisma.notification.findUnique({
      where: { userId_channel_dedupeKey: { userId, channel, dedupeKey } },
      select: { id: true, sentAt: true }
    });

    if (existing?.sentAt) {
      return { status: 'sent' };
    }

    if (existing) {
      const claimed = await this.prisma.notification.updateMany({
        where: {
          id: existing.id,
          sentAt: null,
          OR: [{ claimedAt: null }, { claimedAt: { lt: subMilliseconds(now, NOTIFICATION_LEDGER.claimLeaseMs) } }]
        },
        data: { claimedAt: now, failedAt: null }
      });

      return claimed.count > 0 ? { status: 'claimed', id: existing.id } : { status: 'inFlight' };
    }

    try {
      const created = await this.prisma.notification.create({
        data: { userId, channel, dedupeKey, event: notification.event, payload: { ...notification, ...rendered }, claimedAt: now },
        select: { id: true }
      });

      return { status: 'claimed', id: created.id };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: 'inFlight' };
      }

      throw error;
    }
  }
}
