import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { ClaimIngestEventsInput, ClaimIngestQuotaInput, IngestBattleQuotaInput } from '../mod.types';

import { ModException } from '../../../common/exceptions';
import { secondsUntilNextDay } from '../../../common/lib';
import { REDIS } from '../../../core';
import { MOD_INGEST_QUOTA } from '../config/ingest.constants';
import { ingestQuotaKey } from '../lib/ingest-quota/ingest-quota';

@Injectable()
export class IngestQuotaWriterService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async claimEvents({ accountId, count, now }: ClaimIngestEventsInput): Promise<void> {
    const key = ingestQuotaKey({ kind: 'events', accountId, now });

    await this.claim({ key, count, limit: MOD_INGEST_QUOTA.eventsPerDay, now });
  }

  async claimBattle({ accountId, now }: IngestBattleQuotaInput): Promise<void> {
    const key = ingestQuotaKey({ kind: 'battles', accountId, now });

    await this.claim({ key, count: 1, limit: MOD_INGEST_QUOTA.newBattlesPerDay, now });
  }

  async releaseBattle({ accountId, now }: IngestBattleQuotaInput): Promise<void> {
    const key = ingestQuotaKey({ kind: 'battles', accountId, now });

    await this.redis.decr(key);
  }

  private async claim({ key, count, limit, now }: ClaimIngestQuotaInput): Promise<void> {
    const total = await this.redis.eval(MOD_INGEST_QUOTA.script, 1, key, count, limit, MOD_INGEST_QUOTA.ttlSeconds);

    if (Number(total) !== MOD_INGEST_QUOTA.refused) {
      return;
    }

    throw new ModException({
      status: HttpStatus.TOO_MANY_REQUESTS,
      error: 'rate_limited',
      message: 'The daily ingest quota of the account is used up',
      retryAfterSeconds: secondsUntilNextDay(now)
    });
  }
}
