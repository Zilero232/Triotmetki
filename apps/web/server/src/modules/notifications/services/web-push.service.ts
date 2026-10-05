import { Injectable, Logger } from '@nestjs/common';
import { isPushServiceUrl } from '@otmetki/schemas';
import { WebPushError } from 'web-push';

import type { WebPushInput } from '../notifications.types';

import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { HostLookupService, publicAddressOf } from '../../developer';
import { WEB_PUSH } from '../config/delivery.constants';
import { vapidDetails } from '../lib/web-push-config';
import { WebPushSenderService } from './web-push-sender.service';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly sender: WebPushSenderService,
    private readonly hosts: HostLookupService
  ) {}

  get isEnabled(): boolean {
    return this.vapid() !== null;
  }

  async sendToUser({ userId, title, body, url }: WebPushInput): Promise<void> {
    const vapid = this.vapid();

    if (!vapid) {
      return;
    }

    const stored = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const reachable = await Promise.all(stored.map(async ({ endpoint }) => this.isSafeEndpoint(endpoint)));
    const subscriptions = stored.filter((_subscription, index) => reachable[index]);
    const payload = JSON.stringify({ title, body, url });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        this.sender.send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
          TTL: WEB_PUSH.ttlSeconds,
          timeout: WEB_PUSH.timeoutMs,
          vapidDetails: vapid
        })
      )
    );

    const gone = subscriptions.filter((subscription, index) => {
      const result = results[index];

      return result?.status === 'rejected' && result.reason instanceof WebPushError && WEB_PUSH.goneStatuses.includes(result.reason.statusCode);
    });

    if (gone.length > 0) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: gone.map((subscription) => subscription.id) } } });
      this.logger.log(`removed ${gone.length} expired push subscriptions of ${userId}`);
    }

    const failed = results.filter((result) => result.status === 'rejected').length - gone.length;

    if (failed > 0 && failed === subscriptions.length - gone.length) {
      throw new Error(`web push to ${userId} failed on every subscription`);
    }
  }

  private vapid() {
    return vapidDetails({
      VAPID_PUBLIC_KEY: this.config.get('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY: this.config.get('VAPID_PRIVATE_KEY'),
      VAPID_SUBJECT: this.config.get('VAPID_SUBJECT')
    });
  }

  private async isSafeEndpoint(endpoint: string): Promise<boolean> {
    if (!isPushServiceUrl(endpoint)) {
      return false;
    }

    return (await publicAddressOf({ url: endpoint, lookup: this.hosts.resolve })) !== null;
  }
}
