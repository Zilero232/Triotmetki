import { OFFICIAL_RATINGS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LestaClient } from '../../../../lib/lesta';
import type { OfficialRatingTypesService } from '../../../reference';

import { OFFICIAL_PERIOD_TO_LESTA } from '../../../../common/lib';
import { PlayerOfficialRatingsReaderService } from '../player-official-ratings-reader.service';

const createService = (lestaTypes: string[]) => {
  const types = mock<OfficialRatingTypesService>();
  const lesta = mockDeep<LestaClient>();

  types.lestaTypes.mockResolvedValue(lestaTypes);

  return { service: new PlayerOfficialRatingsReaderService(types, lesta), lesta };
};

describe('PlayerOfficialRatingsReaderService.ratings', () => {
  it('asks only for the profile periods Lesta offers', async () => {
    const { service, lesta } = createService([OFFICIAL_PERIOD_TO_LESTA['7d'], OFFICIAL_PERIOD_TO_LESTA.overall]);

    lesta.ratings.accounts.mockResolvedValue({ 5: { account_id: 5, wins_ratio: { value: 56, rank: 300, rank_delta: 12 } } });

    const result = await service.ratings(5n);

    expect(lesta.ratings.accounts).toHaveBeenCalledOnce();
    expect(lesta.ratings.accounts).toHaveBeenCalledWith({ type: OFFICIAL_PERIOD_TO_LESTA['7d'], accountIds: [5] });
    expect(result.periods).toEqual([{ period: '7d', fields: { winRate: { value: 56, rank: 300, rankDelta: 12 } } }]);
  });

  it('leaves out a period the player is not ranked in and one that failed', async () => {
    const { service, lesta } = createService(OFFICIAL_RATINGS.profilePeriods.map((period) => OFFICIAL_PERIOD_TO_LESTA[period]));

    lesta.ratings.accounts.mockResolvedValueOnce({ 5: null }).mockRejectedValueOnce(new Error('SOURCE_NOT_AVAILABLE'));

    await expect(service.ratings(5n)).resolves.toMatchObject({ accountId: 5, periods: [] });
  });
});
