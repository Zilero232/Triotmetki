import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { LedgerKeyInput } from '../mod.types';

import { REDIS } from '../../../core';
import { MOD_INGEST } from '../config/ingest.constants';

@Injectable()
export class EventLedgerService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async claim(input: LedgerKeyInput): Promise<boolean> {
    const result = await this.redis.set(this.key(input), '1', 'EX', MOD_INGEST.ledgerTtlSeconds, 'NX');

    return result === 'OK';
  }

  async release(input: LedgerKeyInput): Promise<void> {
    await this.redis.del(this.key(input));
  }

  private key({ accountId, eventId }: LedgerKeyInput): string {
    return `${MOD_INGEST.ledgerPrefix}${accountId}:${eventId}`;
  }
}
