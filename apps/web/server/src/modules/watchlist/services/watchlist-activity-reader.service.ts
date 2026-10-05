import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { WatchlistQueries } from '../providers/watchlist-queries.provider.types';
import type { PlayerActivityInput, PlayerActivityRow } from '../watchlist.types';

import { PrismaService } from '../../../core';
import { WATCHLIST_QUERIES } from '../config/queries.constants';
import { WATCHLIST_DIGEST_RUN } from '../config/queue.constants';

@Injectable()
export class WatchlistActivityReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WATCHLIST_QUERIES) private readonly queries: WatchlistQueries
  ) {}

  async activity({ accountIds, since }: PlayerActivityInput): Promise<Map<bigint, PlayerActivityRow>> {
    if (accountIds.length === 0) {
      return new Map();
    }

    const ids = [...accountIds];
    const window = { db: this.prisma.$kysely, accountIds: ids.map((accountId) => Number(accountId)), since };

    const [sessions, marks] = await Promise.all([
      this.queries.sessionTotals(window),
      this.queries.marksGained({ ...window, lookback: subDays(since, WATCHLIST_DIGEST_RUN.marksLookbackDays) })
    ]);

    const sessionOf = new Map(sessions.map((row) => [BigInt(row.account_id), row]));
    const marksOf = new Map(marks.map((row) => [BigInt(row.account_id), row.marks]));

    return new Map(
      ids.map((accountId) => {
        const session = sessionOf.get(accountId);

        return [
          accountId,
          {
            accountId,
            battles: session?.battles ?? 0,
            wins: session?.wins ?? 0,
            damage: session?.damage ?? 0,
            lastBattleAt: session?.last_at ?? null,
            marksGained: marksOf.get(accountId) ?? 0
          }
        ];
      })
    );
  }
}
