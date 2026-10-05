import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../core';

import { OfficialRatingTypesReaderService } from '../official-rating-types-reader.service';

describe('OfficialRatingTypesReaderService.lestaTypes', () => {
  it('lists the rating types Lesta offers and asks only once', async () => {
    const clients = mockDeep<LestaClients>();
    const service = new OfficialRatingTypesReaderService(clients);

    clients.priority.ratings.typeList.mockResolvedValue({ 7: { type: '7' }, all: { type: 'all' } });

    await expect(service.lestaTypes()).resolves.toEqual(['7', 'all']);
    await service.lestaTypes();

    expect(clients.priority.ratings.typeList).toHaveBeenCalledOnce();
  });

  it('offers nothing during an outage and asks again next time', async () => {
    const clients = mockDeep<LestaClients>();
    const service = new OfficialRatingTypesReaderService(clients);

    clients.priority.ratings.typeList.mockRejectedValueOnce(new Error('SOURCE_NOT_AVAILABLE')).mockResolvedValue({ 28: { type: '28' } });

    await expect(service.lestaTypes()).resolves.toEqual([]);
    await expect(service.lestaTypes()).resolves.toEqual(['28']);
  });
});
