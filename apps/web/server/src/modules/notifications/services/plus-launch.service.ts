import type { OnApplicationBootstrap } from '@nestjs/common';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

import { errorMessage } from '../../../common/lib';
import { REDIS } from '../../../core';
import { PLUS_LAUNCH } from '../config/plus-launch.constants';
import { NOTIFICATION_TOKENS } from '../config/tokens.constants';
import { NotificationService } from './notification.service';

@Injectable()
export class PlusLaunchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlusLaunchService.name);

  constructor(
    private readonly notifications: NotificationService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(NOTIFICATION_TOKENS.plusCheckoutEnabled) private readonly isCheckoutEnabled: boolean
  ) {}

  onApplicationBootstrap(): void {
    void this.announce().then(
      (notified) => {
        if (notified > 0) {
          this.logger.log(`Plus checkout is open: notified ${notified} waiting users`);
        }
      },
      (error: unknown) => {
        this.logger.warn(`Plus checkout announcement failed: ${errorMessage(error)}`);
      }
    );
  }

  async announce(): Promise<number> {
    if (!this.isCheckoutEnabled) {
      return 0;
    }

    const claimed = await this.redis.set(PLUS_LAUNCH.announcedKey, '1', 'NX');

    if (claimed !== 'OK') {
      return 0;
    }

    try {
      return await this.notifications.broadcast({ notification: { event: 'plusCheckoutOpen' }, dedupeKey: PLUS_LAUNCH.dedupeKey });
    } catch (error) {
      await this.redis.del(PLUS_LAUNCH.announcedKey);

      throw error;
    }
  }
}
