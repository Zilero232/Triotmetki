import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { PurgeTableInput, RetentionResult } from '../purge.types';
import type { RetentionQueries } from '../queries/retention.types';

import { PrismaService } from '../../../../core';
import { PURGE_TOKENS, RETENTION } from '../config/purge.constants';

@Injectable()
export class RetentionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PURGE_TOKENS.retentionQueries) private readonly queries: RetentionQueries
  ) {}

  async purgeExpired(now = new Date()): Promise<RetentionResult> {
    const result: RetentionResult = {};

    for (const rule of RETENTION.rules) {
      result[rule.table] = await this.purgeTable({ rule, cutoff: subDays(now, rule.days) });
    }

    return result;
  }

  private async purgeTable({ rule, cutoff }: PurgeTableInput): Promise<number> {
    let deleted = 0;

    for (;;) {
      const count = await this.queries.deleteExpiredBatch({ db: this.prisma.$kysely, rule, cutoff, limit: RETENTION.deleteBatch });

      deleted += count;

      if (count < RETENTION.deleteBatch) {
        return deleted;
      }
    }
  }
}
