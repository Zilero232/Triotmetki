import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { WatchlistQueries } from '../../providers/watchlist-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { WatchlistActivityReaderService } from '../watchlist-activity-reader.service';

const since = new Date('2026-09-25T10:00:00Z');
const lastAt = new Date('2026-09-26T08:00:00Z');

const sessionTotal = (accountId: number) => ({ account_id: accountId, battles: 5, wins: 3, damage: 9_000, last_at: lastAt });

const setup = () => {
  const prisma = mockPrismaService();
  const queries = mock<WatchlistQueries>();

  queries.marksGained.mockResolvedValue([]);
  queries.sessionTotals.mockResolvedValue([]);

  return { queries, service: new WatchlistActivityReaderService(prisma, queries) };
};

describe('WatchlistActivityReaderService.activity', () => {
  it('returns an empty map when nobody is followed', async () => {
    const { service } = setup();

    expect((await service.activity({ accountIds: [], since })).size).toBe(0);
  });

  it('merges session totals and gained marks per account', async () => {
    const { queries, service } = setup();

    queries.sessionTotals.mockResolvedValue([sessionTotal(1)]);
    queries.marksGained.mockResolvedValue([{ account_id: 1, marks: 2 }]);

    const activity = await service.activity({ accountIds: [1n], since });

    expect(activity.get(1n)).toEqual({ accountId: 1n, battles: 5, wins: 3, damage: 9_000, lastBattleAt: lastAt, marksGained: 2 });
  });

  it('reports zeros and no last battle for a followed account with no activity', async () => {
    const { service } = setup();

    const activity = await service.activity({ accountIds: [1n, 2n], since });

    expect(activity.get(2n)).toEqual({ accountId: 2n, battles: 0, wins: 0, damage: 0, lastBattleAt: null, marksGained: 0 });
  });

  it('keeps the followed order', async () => {
    const { service } = setup();

    const activity = await service.activity({ accountIds: [2n, 1n], since });

    expect([...activity.keys()]).toEqual([2n, 1n]);
  });
});
