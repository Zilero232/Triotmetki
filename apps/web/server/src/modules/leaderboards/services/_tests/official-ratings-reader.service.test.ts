import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';

import { OFFICIAL_FIELD_TO_LESTA, OFFICIAL_PERIOD_TO_LESTA } from '../../lib/official-rating/official-rating.constants';
import { OfficialRatingsReaderService } from '../official-ratings-reader.service';

const DAY = 86_400;

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const lesta = mockDeep<LestaClient>();

  prisma.player.findMany.mockResolvedValue([]);

  return { service: new OfficialRatingsReaderService(prisma, lesta), prisma, lesta };
};

describe('OfficialRatingsReaderService.top', () => {
  it('names known players from our table and asks Lesta only for the rest', async () => {
    const { service, prisma, lesta } = createService();

    lesta.ratings.topList.mockResolvedValue([
      { account_id: 1, global_rating: { value: 9900, rank: 1, rank_delta: 0 } },
      { account_id: 2, global_rating: { value: 9800, rank: 2, rank_delta: 3 } }
    ]);

    prisma.player.findMany.mockResolvedValue([
      Object.assign(mock<Player>({ accountId: 1n, nickname: 'Known' }), { clanMembership: { clan: { tag: 'BRNV' } } })
    ]);

    lesta.account.info.mockResolvedValue({ 2: { nickname: 'Fetched' } });

    const top = await service.top({ period: 'overall', field: 'globalRating', limit: 2, page: 1 });

    expect(lesta.ratings.topList).toHaveBeenCalledWith({
      type: OFFICIAL_PERIOD_TO_LESTA.overall,
      rankField: OFFICIAL_FIELD_TO_LESTA.globalRating,
      limit: 2,
      pageNo: 1
    });

    expect(lesta.account.info).toHaveBeenCalledWith(expect.objectContaining({ accountIds: [2] }));

    expect(top.items).toEqual([
      { accountId: 1, nickname: 'Known', clanTag: 'BRNV', value: 9900, rank: 1, rankDelta: 0 },
      { accountId: 2, nickname: 'Fetched', clanTag: null, value: 9800, rank: 2, rankDelta: 3 }
    ]);
  });

  it('keeps an entry without a nickname when Lesta cannot name it', async () => {
    const { service, lesta } = createService();

    lesta.ratings.topList.mockResolvedValue([{ account_id: 3, wins_ratio: { value: 70, rank: 1, rank_delta: null } }]);
    lesta.account.info.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));

    const top = await service.top({ period: '28d', field: 'winRate', limit: 1, page: 1 });

    expect(top.items).toEqual([{ accountId: 3, nickname: null, clanTag: null, value: 70, rank: 1, rankDelta: null }]);
  });
});

describe('OfficialRatingsReaderService.history', () => {
  it('reads the latest dates, oldest first, and skips days the player was not ranked', async () => {
    const { service, lesta } = createService();
    const today = 20_000 * DAY;
    const type = OFFICIAL_PERIOD_TO_LESTA['7d'];

    lesta.ratings.dateList.mockResolvedValue({ [type]: { dates: [today - 2 * DAY, today, today - DAY] } });

    lesta.ratings.accounts.mockImplementation(async ({ date }) =>
      date === today - DAY ? { 5: null } : { 5: { account_id: 5, wins_ratio: { value: 55, rank: date === today ? 90 : 100, rank_delta: null } } }
    );

    const history = await service.history({ accountId: 5n, query: { period: '7d', field: 'winRate', days: 3 } });

    expect(history.points.map((point) => point.rank)).toEqual([100, 90]);
    expect(history.points[0]?.date < (history.points[1]?.date ?? '')).toBe(true);
  });

  it('asks for no more days than requested', async () => {
    const { service, lesta } = createService();
    const type = OFFICIAL_PERIOD_TO_LESTA.overall;

    lesta.ratings.dateList.mockResolvedValue({ [type]: { dates: [1, 2, 3, 4].map((day) => day * DAY) } });
    lesta.ratings.accounts.mockResolvedValue({});

    await service.history({ accountId: 5n, query: { period: 'overall', field: 'globalRating', days: 2 } });

    expect(lesta.ratings.accounts).toHaveBeenCalledTimes(2);
  });
});
