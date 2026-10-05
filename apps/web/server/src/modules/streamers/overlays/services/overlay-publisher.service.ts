import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { REDIS } from '../../../../core';
import { OVERLAY } from '../config/overlay.constants';

@Injectable()
export class OverlayPublisherService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  channelOf(accountId: bigint): string {
    return `${OVERLAY.channelPrefix}${accountId}`;
  }

  async publish(accountId: bigint): Promise<void> {
    await this.redis.publish(this.channelOf(accountId), String(Date.now()));
  }
}
