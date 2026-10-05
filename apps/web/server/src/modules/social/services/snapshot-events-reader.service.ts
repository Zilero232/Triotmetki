import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { RecordEventRow, SnapshotEventsQueries, TankEventRow } from '../queries/snapshot-events.types';
import type { SnapshotWindow } from '../social.types';

import { PrismaService } from '../../../core';
import { FEED } from '../config/feed.constants';
import { SOCIAL_QUERY_TOKENS } from '../config/queries.constants';
import { isMarkGain } from '../lib/feed/feed';

@Injectable()
export class SnapshotEventsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SOCIAL_QUERY_TOKENS.snapshotEvents) private readonly queries: SnapshotEventsQueries
  ) {}

  async tankEvents({ accountIds, since, until }: SnapshotWindow): Promise<TankEventRow[]> {
    if (accountIds.length === 0) {
      return [];
    }

    return this.queries.tankEvents({
      db: this.prisma.$kysely,
      accountIds: accountIds.map(Number),
      lookback: subDays(since, FEED.lookbackDays),
      since,
      until,
      aceMastery: FEED.aceMastery
    });
  }

  async recordEvents({ accountIds, since, until }: SnapshotWindow): Promise<RecordEventRow[]> {
    if (accountIds.length === 0) {
      return [];
    }

    return this.queries.recordEvents({
      db: this.prisma.$kysely,
      accountIds: accountIds.map(Number),
      lookback: subDays(since, FEED.lookbackDays),
      since,
      until
    });
  }

  async markCounts(window: SnapshotWindow): Promise<Map<bigint, number>> {
    const events = await this.tankEvents(window);
    const counts = new Map<bigint, number>();

    for (const event of events) {
      if (isMarkGain(event)) {
        const accountId = BigInt(event.accountId);

        counts.set(accountId, (counts.get(accountId) ?? 0) + ((event.marksOnGun ?? 0) - (event.prevMarks ?? 0)));
      }
    }

    return counts;
  }
}
